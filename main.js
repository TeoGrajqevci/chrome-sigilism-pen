import './style.css';
import Pen from '/js/Pen';
import GUI from '/js/GUI';
import Canvas3D from './js/3d';

let pen = new Pen();
let canvas3D = new Canvas3D();
let gui = new GUI(pen, canvas3D);

document.documentElement.style.cursor = "crosshair";