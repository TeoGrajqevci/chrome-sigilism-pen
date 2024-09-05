
import { Pane } from 'tweakpane';

export default class GUI {  
    constructor(pen, canvas3D) {
        
        this.pen = pen;
        this.canvas3D = canvas3D;

        const pane = new Pane();

       const penFolder = pane.addFolder({
            title: 'Pen',
        });

        penFolder.addBinding(pen, 'strokeWidth', {
            min: 1,
            max: 100,
            step: 1,
        }).on('change', (ev) => {
            pen.strokeWidth = ev.value;
        });

        penFolder.addBinding(pen , 'circleRadius', {
            min: 0,
            max: 75,
            step: 1,
        }).on('change', (ev) => {
            pen.circleRadius = ev.value;
        });
        

        penFolder.addButton({
            title: 'Undo',
        }).on('click', () => {
            pen.undo();
        });

        penFolder.addButton({
            title: 'Redo',
        }).on('click', () => {
            pen.redo();
        });


       // add a button to clear the canvas
        penFolder.addButton({
            title: 'Clear',
        }).on('click', () => {
            pen.clear();
        });

        // penFolder.addButton({
        //     title: 'Save',
        // }).on('click', () => {
        //     pen.download();
        // });



        let canvas3DParams = {
            // Metalness: canvas3D.metalness,
            // Roughness: canvas3D.roughness,
            // Exposure: canvas3D.exposure,
            Blur: canvas3D.blurRadius = 33,
            HDR:null ,
        };

        const canvas3DFolder = pane.addFolder({
            title: 'Canvas3D',
        });

        // canvas3DFolder.addBinding(canvas3DParams, 'Metalness', {
        //     min: 0,
        //     max: 1,
        //     step: 0.01,
        // }).on('change', (ev) => {
        //     canvas3D.metalness = ev.value;
        // });

        // canvas3DFolder.addBinding(canvas3DParams, 'Roughness', {
        //     min: 0,
        //     max: 1,
        //     step: 0.01,
        // }).on('change', (ev) => {
        //     canvas3D.roughness = ev.value;
        // });

        // canvas3DFolder.addBinding(canvas3DParams, 'Exposure', {
        //     min: 0,
        //     max: 5,
        //     step: 0.01,
        // }).on('change', (ev) => {
        //     canvas3D.exposure = ev.value;
        // });

        canvas3DFolder.addBinding(canvas3DParams, 'HDR',{
            options: {
                Dark: 'dark',
                Light: 'light'
            }
            });

        canvas3DFolder.addBinding(canvas3DParams, 'Blur', {
            min: 20,
            max: 80,
            step: 1,
        }).on('change', (ev) => {
           canvas3D.blurRadius = ev.value;
        });
    }
}