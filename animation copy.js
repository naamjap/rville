//Start pitch detection 
async function setupPitchDetector(minFrequency, maxFrequency) {
  const audio = document.querySelector("audio");
  const bufferSize = 4096;
  const canvas = document.querySelector("canvas");
  const canvasContext = canvas.getContext("2d");
  canvas.width = document.body.clientWidth;
  canvas.height = document.body.clientHeight;

  const pitchElement = document.querySelector("#pitch");
  const inputField = document.getElementById('noteSequence');

  // Mapping of traditional note names to custom names
  const noteMapping = {
    C: "S",
    "C#": "r",
    D: "R",
    "D#": "g",
    E: "G",
    F: "M",
    "F#": "m",
    G: "P",
    "G#": "d",
    A: "D",
    "A#": "n",
    B: "N",
  };

  // Function to get custom note name from traditional note name
  function getCustomNoteName(toneNote) {
    const noteName = toneNote.replace(/\d+$/, "");
    return noteMapping[noteName] || noteName;
  }

  // Draw a line based on frequency bounds
  function drawFrequencyLine(frequency) {
    canvasContext.clearRect(0, 0, canvas.width, canvas.height);
    const y = canvas.height - (frequency - minFrequency) / (maxFrequency - minFrequency) * canvas.height;
    canvasContext.beginPath();
    canvasContext.moveTo(0, y);
    canvasContext.lineTo(canvas.width, y);
    canvasContext.strokeStyle = 'red';
    canvasContext.stroke();
  }

  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  await audioContext.audioWorklet.addModule('PitchProcessor.js');

  // Load aubio module
  const aubioModule = await aubio();

  // Ensure aubioModule is resolved before creating AudioWorkletNode
  const resolvedAubioModule = await aubioModule;
  const pitchProcessor = new AudioWorkletNode(audioContext, 'pitch-processor', {
    processorOptions: { aubioModule: resolvedAubioModule }
  });

  pitchProcessor.port.onmessage = (event) => {
    const pitch = event.data;
    if (pitch && pitch > 0) {
      pitchElement.textContent = `Detected pitch: ${pitch.toFixed(2)} Hz`;
      drawFrequencyLine(pitch);
    }
  };

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const source = audioContext.createMediaStreamSource(stream);
    source.connect(pitchProcessor).connect(audioContext.destination);
  } catch (err) {
    console.error('Error accessing audio stream:', err);
    alert('Error accessing audio stream: ' + err.message);
  }
}

//End pitch detection

class Ball {
  constructor(diameter) {
    this.diameter = diameter;
    this.position = createVector(0, 0);
  }

  update(position) {
    this.position = position;
  }

  draw() {
    fill(255, 0, 0); // Red color
    noStroke();
    ellipse(this.position.x, this.position.y, this.diameter, this.diameter);
  }
}

class Path {
  constructor(points) {
    this.points = points.map(p => createVector(p.x, p.y)); // Ensure points are p5.Vector instances
  }

  draw() {
    noFill();
    beginShape();
  
    for (let i = 0; i < this.points.length; i++) {
      vertex(this.points[i].x, this.points[i].y);
    }
    endShape();
  }
}

class PathFollower {
  constructor(path, speed) {
    this.path = path;
    this.speed = speed;
    this.index = 0;
  }

  update() {
    this.index += this.speed;
    if (this.index >= this.path.points.length) {
      this.index = 0; // Loop back to the start
      return true; // Indicate that the path is completed
    }
    return false;
  }

  getPosition() {
    return this.path.points[floor(this.index)];
  }
}

class Arrow {
  constructor(start, end) {
    this.start = start;
    this.end = end;
  }

  update(position) {
  this.start = position;
    this.end = position;
  }

  draw() {
    stroke(0);
    strokeWeight(2);
    fill(0);
    line(this.start.x, this.start.y, this.end.x, this.end.y);

    // Calculate the angle of the arrow
    let angle = atan2(this.end.y - this.start.y, this.end.x - this.start.x);

    // Draw the arrowhead
    push();
    translate(this.end.x, this.end.y);
    rotate(angle);
    let arrowSize = 7;
    beginShape();
    vertex(0, 0);
    vertex(-arrowSize, arrowSize / 2);
    vertex(-arrowSize, -arrowSize / 2);
    endShape(CLOSE);
    pop();
  }
}

let ball;
let paths = [];
let pathFollower;
let currentPathIndex = 0;
let arrow;
let notes, frequencies;

// Given notes
//const givenNotes = ['S3', 'R3', 'G3', 'R3', 'S3', 'N2'];
const givenNotes = ['S3', 'R3', 'G3','R3', 'G3','R3', 'G3','R3', 'G3', 'P3', 'D3', 'S4' , 'R4', 'D3'];
const notesScreen = [
  'F2', 'F#2', 'G2', 'G#2', 'A2', 'A#2', 'B2',
  'C3', 'C#3', 'D3', 'D#3', 'E3', 'F3', 'F#3', 'G3', 'G#3', 'A3', 'A#3', 'B3',
  'C4', 'C#4', 'D4', 'D#4', 'E4', 'F4', 'F#4', 'G4', 'G#4', 'A4', 'A#4', 'B4',  
   
];
const indianNotesWithFrequencies = {};

function generateFrequencyBounds() {
  
  const _frequencies = notesScreen.map(note => Tone.Frequency(note).toFrequency());
  return { notesScreen, _frequencies };
}

async function initializeTone() {
  await Tone.start();
  const result = generateFrequencyBounds();
  notes = result.notesScreen;
  frequencies = result._frequencies;
  console.log('Tone.js initialized');
}



 // Function to map frequency to height
 function mapFrequencyToHeight(frequency) {
  const minFrequency = 87; // Frequency of S2
  const maxFrequency = 246; // Frequency of N5
  const minHeight = 0;
  const maxHeight = windowHeight; // Example max height value

  // Invert the mapping: higher frequency -> lower height
  return map(frequency, minFrequency, maxFrequency, maxHeight, minHeight);
}

/**
function offsetPath(path, margin) {
  let offsetPoints = [];
  for (let i = 0; i < path.points.length - 1; i++) {
    let p1 = path.points[i];
    let p2 = path.points[i + 1];
    let direction = p5.Vector.sub(p2, p1).normalize();
    let perpendicular = createVector(-direction.y, direction.x).mult(margin);
    offsetPoints.push(p1.copy().add(perpendicular));
    offsetPoints.push(p2.copy().add(perpendicular));
  }
  return new Path(offsetPoints);
}
*/
function offsetPath(path, margin) {
  let offsetPoints = [];
  for (let i = 0; i < path.points.length; i++) {
    let p = path.points[i];
    let offsetY = margin > 0 ? p.y + margin : p.y - Math.abs(margin);
    offsetPoints.push(createVector(p.x, offsetY));
  }
  return new Path(offsetPoints);
}




// Function to perform cubic spline interpolation
function cubicSplineInterpolation(points, numSamples) {
  const n = points.length - 1;
  const a = points.map(p => p.y);
  const b = new Array(n).fill(0);
  const d = new Array(n).fill(0);
  const h = points.map((p, i) => (i < n ? points[i + 1].x - p.x : 0));
  const alpha = new Array(n).fill(0);

  for (let i = 1; i < n; i++) {
    alpha[i] = (3 / h[i]) * (a[i + 1] - a[i]) - (3 / h[i - 1]) * (a[i] - a[i - 1]);
  }

  const c = new Array(n + 1).fill(0);
  const l = new Array(n + 1).fill(1);
  const mu = new Array(n).fill(0);
  const z = new Array(n + 1).fill(0);

  for (let i = 1; i < n; i++) {
    l[i] = 2 * (points[i + 1].x - points[i - 1].x) - h[i - 1] * mu[i - 1];
    mu[i] = h[i] / l[i];
    z[i] = (alpha[i] - h[i - 1] * z[i - 1]) / l[i];
  }

  for (let j = n - 1; j >= 0; j--) {
    c[j] = z[j] - mu[j] * c[j + 1];
    b[j] = (a[j + 1] - a[j]) / h[j] - h[j] * (c[j + 1] + 2 * c[j]) / 3;
    d[j] = (c[j + 1] - c[j]) / (3 * h[j]);
  }

  const interpolatedPoints = [];
  for (let i = 0; i < n; i++) {
    const x0 = points[i].x;
    const x1 = points[i + 1].x;
    for (let x = x0; x < x1; x += (x1 - x0) / numSamples) {
      const dx = x - x0;
      const y = a[i] + b[i] * dx + c[i] * dx * dx + d[i] * dx * dx * dx;
      interpolatedPoints.push({ x, y });
    }
  }
  interpolatedPoints.push(points[n]); // Add the last point
  return interpolatedPoints;
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  document.addEventListener('click', async () => {
    await initializeTone();
    
    
  // Third Path
  // Initialize points3 with given notes
  
  let points3 = [];
  
  const minFreq = frequencies[0];
  const maxFreq = frequencies[frequencies.length - 1];
  const numPoints = givenNotes.length;
  const xSpacing = windowWidth / (numPoints + 1);
  
  // Calculate the x and y coordinates for each given note
  let notePoints = givenNotes.map((note, index) => {
    const y = map(indianNotesWithFrequencies[note], minFreq, maxFreq, height, 0);
    const x = xSpacing * (index + 1);
    return { x, y };
  });
  
  // Interpolate between the given notes to create a smooth curve
  points3 = cubicSplineInterpolation(notePoints, 100);

  // Push the new path into the paths array
  paths.push(new Path(points3));
  
  setupPitchDetector(minFreq, maxFreq);
  }, { once: true }); // Ensure the event listener is only triggered once

  
  // Initialize multiple paths
  // First Path

  let points1 = [];
  for (let x = 0; x <= width; x += 10) {
    let y = height / 2 + 50 * sin(TWO_PI * x / width);
    console.log(x,y );
    points1.push({x: x, y: y});
  }
  paths.push(new Path(points1));
/***
  // Second Path
  let points2 = [];
  for (let x = 0; x <= width; x += 10) {
    let y = height / 2 + 50 * cos(TWO_PI * x / width);
    points2.push({x: x, y: y});
  }
  paths.push(new Path(points2));


  //End of paths
 */

    // Initialize ball and path follower
    ball = new Ball(20);
    pathFollower = new PathFollower(paths[currentPathIndex], 0.5);
  
    // Initialize arrow
    arrow = new Arrow(createVector(100, 100), createVector(200, 200));
  
    const noteMapping = {
      C: "S",
      "C#": "r",
      D: "R",
      "D#": "g",
      E: "G",
      F: "M",
      "F#": "m",
      G: "P",
      "G#": "d",
      A: "D",
      "A#": "n",
      B: "N",
    };
    
    const westernNotes = [
      'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'
    ];
  
    const octaves = [2, 3, 4, 5];
   
    octaves.forEach(octave => {
      westernNotes.forEach(westernNote => {
        const indianNote = `${noteMapping[westernNote]}${octave}`;
        const frequency = Tone.Frequency(`${westernNote}${octave}`).toFrequency();
        indianNotesWithFrequencies[indianNote] = frequency;
      });
    });

}





function draw() {
  background(16, 16, 12); // Clear the background

  if (!frequencies || frequencies.length === 0) {
    return; // Wait until frequencies are loaded
  }

  const minFreq = frequencies[0];
  const maxFreq = frequencies[frequencies.length - 1];



   // Solid Line
   stroke(255); // Set stroke color to grey
   strokeWeight(1); // Set stroke weight
   drawingContext.setLineDash([]); // Solid line
  // Draw the current path
  paths[currentPathIndex].draw();



  
  // Create and draw offset paths
  let positiveOffsetPath = offsetPath(paths[currentPathIndex], 50);
  let negativeOffsetPath = offsetPath(paths[currentPathIndex], -50);

   // Solid Line
   stroke(128,255,128); // Set stroke color to green
   strokeWeight(2); // Set stroke weight
   drawingContext.setLineDash([5,5]); // Solid line
   positiveOffsetPath.draw();
 
   // Dashed Line
   stroke(128,255,128); // Set stroke color to green
   strokeWeight(2); // Set stroke weight
   drawingContext.setLineDash([5, 5]); // Dashed line
   negativeOffsetPath.draw();
  
  // Reset line dash for other drawings
  drawingContext.setLineDash([]);

  // Update and draw the ball
  let pathCompleted = pathFollower.update();
  let position = pathFollower.getPosition();
  ball.update(position);
  ball.draw();

  // Update and draw the arrow
  arrow.update(position);
  arrow.draw();

  // Switch to the next path if the current path is completed
  if (pathCompleted) {
    currentPathIndex = (currentPathIndex + 1) % paths.length;
    pathFollower = new PathFollower(paths[currentPathIndex], 0.5);
  }

    // Get frequencies and map to height values
    givenNotes.map((note, index) => {
    
      y = map(indianNotesWithFrequencies[note], minFreq, maxFreq, height, 0);
      //console.log('y ', note, y);
      const numPoints = givenNotes.length;
      const xSpacing = windowWidth / (numPoints + 1);
      const x = xSpacing * (index + 1);
  
      // Now you can use x and y for further processing, e.g., drawing points
      ellipse(x, y, 5, 5); // Example of drawing a point
  
    });

    // Map frequencies to y values and draw them
    for (let i = 0; i < frequencies.length; i++) {
      let y = map(frequencies[i], minFreq, maxFreq, height, 0);
      fill(255); // Set fill color to white 
      text(`${notes[i]} (${frequencies[i].toFixed(2)} Hz)`, width/2 + 20, y);
      text(`${notes[i]} (${frequencies[i].toFixed(2)} Hz)`,   20, y);
      text(`${notes[i]} (${frequencies[i].toFixed(2)} Hz)`, width - 20, y);
       
    }

  // Log the output of the frequencies to height map for every 10 points of height
  for (let h = 0; h <= height; h += 10) {
    let freq = map(h, 0, height, maxFreq, minFreq);
    let noteIndex = frequencies.findIndex(f => f >= freq);
    let note = noteIndex !== -1 ? notes[noteIndex] : "Unknown";
  //  console.log(`Height: ${h}, Frequency: ${freq.toFixed(2)} Hz, Note: ${note}`);
  }

  
}


