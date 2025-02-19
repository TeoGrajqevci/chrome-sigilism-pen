import paper from 'paper';

export default class Pen {
    constructor() {
        this.paperCanvas = document.createElement('canvas');
        this.paperCanvas.id = 'PAPER';
        this.paperCanvas.style.position = 'fixed';
        this.paperCanvas.style.width = '100%';
        this.paperCanvas.style.height = '100%';
        this.paperCanvas.style.zIndex = '0';

        document.body.appendChild(this.paperCanvas);

        paper.setup(this.paperCanvas);

        const view = new paper.View({
            width: paper.view.viewSize.width,
            height: paper.view.viewSize.height,
        });

        const rectangle = new paper.Path.Rectangle({
            point: [0, 0],
            size: [paper.view.viewSize.width, paper.view.viewSize.height],
            fillColor: 'black',
        });

        rectangle.sendToBack();

        this.tool = new paper.Tool();
        this.path = null;
        this.strokeWidth = 23;
        this.strokeColor = 'white'; 
        this.smoothing = 5; 

        this.circleRadius = 0; 

        this.tool.onMouseDown = (event) => {
            this.path = new paper.Path();
            this.path.strokeWidth = this.strokeWidth;
            this.path.strokeColor = this.strokeColor;
            this.path.strokeCap = 'square';
            this.path.add(event.point);
        };

        this.tool.onMouseDrag = (event) => {
            if (this.path) {
                this.path.add(event.point);
                this.path.smooth({ type: 'continuous', factor: 0.5 }); // Apply smoothing in real-time
            }
        };

        this.tool.onMouseUp = (event) => {
            if (this.path) {
                this.path.add(event.point);
                this.path.simplify(this.smoothing);

                const startPoint = this.path.firstSegment.point;
                const endPoint = this.path.lastSegment.point;

                const startCircle = new paper.Path.Circle({
                    center: startPoint,
                    radius: this.circleRadius, 
                    fillColor: this.strokeColor,
                });

                const endCircle = new paper.Path.Circle({
                    center: endPoint,
                    radius: this.circleRadius, 
                    fillColor: this.strokeColor,
                });

                this.path = null;
            }
        };

        this.clear = () => {
            paper.project.activeLayer.removeChildren();
            paper.project.activeLayer.addChild(rectangle);
        };

        this.undoStack = [];
        this.redoStack = [];

        this.undo = () => {
            if (paper.project.activeLayer.children.length > 1) {
                const lastItem = paper.project.activeLayer.children[paper.project.activeLayer.children.length - 1];
                this.undoStack.push(lastItem);
                lastItem.remove();
            }
        };

        this.redo = () => {
            if (this.undoStack.length > 0) {
                const lastItem = this.undoStack.pop();
                paper.project.activeLayer.addChild(lastItem);
            }
        };

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

    setStrokeWidth(width) {
        this.strokeWidth = width;
    }

    setCircleRadius(radius) {
        this.circleRadius = radius;
    }

    setStrokeColor(color) {
        this.strokeColor = color;
    }

    setSmoothing(smoothing) {
        this.smoothing = smoothing;
    }
}
