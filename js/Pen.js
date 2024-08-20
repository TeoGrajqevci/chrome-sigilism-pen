import paper from 'paper';

export default class Pen {
    constructor(canvas) {
        if (!canvas) {
            throw new Error("Canvas element is required for Pen initialization.");
        }
        this.canvas = canvas;
        paper.setup(this.canvas);

        const view = new paper.View({
            width: paper.view.viewSize.width,
            height: paper.view.viewSize.height,
        });

        const rectangle = new paper.Path.Rectangle({
            point: [0, 0],
            size: [paper.view.viewSize.width, paper.view.viewSize.height],
            fillColor: 'white',
        });

        rectangle.sendToBack();
    
        this.tool = new paper.Tool();
        this.path = null;
        this.strokeWidth = 60; // Initial stroke width
        this.strokeColor = 'black'; // Initial stroke color
        this.smoothing = 5000; // Initial smoothing value

        this.tool.onMouseDown = (event) => {
            this.path = new paper.Path();
            this.path.strokeWidth = 2;
            this.path.strokeCap = 'round';
            this.path.add(event.point);
            this.path.fullySelected = true;
        };

        this.tool.onMouseDrag = (event) => {
            this.path.add(event.point);
        };

        this.tool.onMouseUp = (event) => {
            this.path.fullySelected = false;
            const tolerance = this.smoothing;   
            this.path.simplify(tolerance);
            this.path.strokeWidth = this.strokeWidth;
            this.path.strokeColor = this.strokeColor;
        };

       
        
     this.clear = () => {
        paper.project.activeLayer.removeChildren();
        paper.project.activeLayer.addChild(rectangle);
    }

  
    this.undoStack = [];
    this.redoStack = [];

    this.undo = () => {
        if (paper.project.activeLayer.children.length > 1) {
            const lastItem = paper.project.activeLayer.children[paper.project.activeLayer.children.length - 1];
            this.undoStack.push(lastItem);
            lastItem.remove();
        }
    }

    this.redo = () => {
        if (this.undoStack.length > 0) {
            const lastItem = this.undoStack.pop();
            paper.project.activeLayer.addChild(lastItem);
        }
    }


    addEventListener("keydown", (event) => {
        if (event.key === "u") {
            this.undo();
        }
        if (event.key === "r") {
            this.redo();
        }
        if (event.key === "c") {
            this.clear();
        }   

    });


        addEventListener("resize", () => {
            paper.view.viewSize.width = window.innerWidth;
            paper.view.viewSize.height = window.innerHeight;
            rectangle.size = [paper.view.viewSize.width, paper.view.viewSize.height];
        });

    }



    // Method to update the stroke width
    setStrokeWidth(width) {
        this.strokeWidth = width;
    }

    // Method to update the stroke color
    setStrokeColor(color) {
        this.strokeColor = color;
    }

    setSmoothing(smoothing) {
        this.smoothing = smoothing;
    }
}