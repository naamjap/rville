class Mapper {
  constructor(minFreq, maxFreq, minHeight, maxHeight) {
    this.minFreq = minFreq;
    this.maxFreq = maxFreq;
    this.minHeight = minHeight;
    this.maxHeight = maxHeight;
  }

  mapFrequencyToHeight(frequency) {
    // Inverted linear mapping from frequency to height
    return this.maxHeight - (frequency - this.minFreq) * (this.maxHeight - this.minHeight) / (this.maxFreq - this.minFreq);
  }

  mapHeightToFrequency(height) {
    // Inverted linear mapping from height to frequency
    return this.minFreq + (this.maxHeight - height) * (this.maxFreq - this.minFreq) / (this.maxHeight - this.minHeight);
  }
}


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
class gameFollower {
  constructor(canvaswidth, canvasheight, speed) {
    this.canvaswidth = canvaswidth;
    this.canvasheight = canvasheight;
    this.speed = speed;
    this.x = 0; // Start in the center horizontally
    console.log("this.canvasheight",this.canvasheight);
    this.y = this.canvasheight / 2; // Start in the center vertically
    
  }

  update(pitch) {
    this.x += this.speed;
    if (this.x >= this.canvaswidth) {
      this.x = 0; // Loop back to the start
      return true; // Indicate that the follower has completed the path
    }
  
    console.log("pitch", pitch);
    const targetHeight = mapper.mapFrequencyToHeight(pitch);
  
    // Calculate the difference between current y and targetHeight
    const difference = Math.abs(this.y - targetHeight);
  
    // Dynamically set steppoints based on the difference
    let steppoints = 1;
    if (difference > 50) {
      steppoints = 5;
    } else if (difference > 20) {
      steppoints = 3;
    }
  
    // Determine vertical movement based on pitch relative to the dynamic baseline
    if (this.y > targetHeight) {
      // If pitch is higher than the baseline, move down
      this.y -= steppoints;
      console.log("decreasing y", this.y, " reaching ", targetHeight, "pitch : ", pitch);
    } else if (this.y < targetHeight) {
      // If pitch is lower than the baseline, move up
      this.y += steppoints;
      console.log("increasing y", this.y, " reaching ", targetHeight, "pitch : ", pitch);
    }
  
    // Ensure y stays within the canvas boundaries
    if (this.y < 0) this.y = 0; // Don't go above the canvas
    if (this.y > this.canvasheight) this.y = this.canvasheight; // Don't go below the canvas
  
    return false;
  }

  getPosition() {
    return { x: Math.floor(this.x), y: Math.floor(this.y) };
  }
}
 


class PathFollower {
  constructor(path, speed) {
    this.path = path;
    console.log(this.path);
    this.speed = speed;
    this.index = 0;
  }

  update() {
    this.index += this.speed;
    if (this.index >= this.path.points.length) {
      this.index = 0; // Loop back to the start
      return true; 
    }
    return false;
  }

  getPosition() {
    return this.path.points[floor(this.index)];
  }
}

class PitchFollower {
  constructor(canvaswidth, canvasheight, speed) {
    this.canvaswidth = canvaswidth;
    this.canvasheight = canvasheight;
    this.speed = speed;
    this.index = 0;
    this.x = 0;
    this.y = 0;
  }

  update(pitch) {
    this.index += this.speed;
    if (this.index >= this.canvaswidth) {
      this.index = 0; // Loop back to the start
      return true;  
    }

    // Update x and y based on the pitch
    this.x = this.index;
    this.y = mapFrequencyToHeight(pitch);

    return false;
  }

  getPosition() {
    return { x: floor(this.x), y: floor(this.y) };
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
    stroke(255);
    strokeWeight(2);
    fill(0);
    line(this.start.x, this.start.y, this.end.x, this.end.y);

    // Calculate the angle of the arrow
    let angle = atan2(this.end.y - this.start.y, this.end.x - this.start.x);

    // Draw the arrowhead
    push();
    translate(this.end.x, this.end.y);
    rotate(angle);
    let arrowSize = 5;
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
let audioContext, scriptProcessor, pitchDetector;

let count = 0;
let pathCompleted;
let position;

const bufferSize = 1 << 12;
const size = bufferSize / (1 << 10);

let pathFollower;
let currentPathIndex = 0;
let arrow;
let notes, frequencies;
let minFrequency,maxFrequency;
let notesScreen = [
  'G2', 'G#2', 'A2', 'A#2', 'B2',
  'C3', 'C#3', 'D3', 'D#3', 'E3', 'F3', 'F#3', 

];
let mapper;

// Given notes

const givenNotes = ['S3', 'R3', 'G3', 'R3', 'G3'];




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
  noLoop();
  document.addEventListener('click', async () => {
    await initializeTone();
    minFrequency =  Tone.Frequency('G2').toFrequency(); // Frequency of S2
    maxFrequency = Tone.Frequency('B4').toFrequency(); // Frequency of N5

    mapper = new Mapper(minFrequency,maxFrequency,0,windowHeight);

     // Initialize ball and path follower
  ball = new Ball(20);
  
  gameF = new gameFollower(windowWidth, windowHeight, 5.5);
  newPosition = gameF.getPosition;
  console.log("ppp",newPosition.x,newPosition.y);

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

    if (audioContext) return;
    else {
      try {
        // Create and resume AudioContext
        audioContext = new (AudioContext || webkitAudioContext)();
        await audioContext.resume();
        console.log("AudioContext resumed.");

        // Request access to the user's microphone
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        const source = audioContext.createMediaStreamSource(stream);
        console.log("Microphone access granted.");

        // Create a ScriptProcessorNode for audio processing
        scriptProcessor = audioContext.createScriptProcessor(
          bufferSize,
          1,
          1
        );
        source.connect(scriptProcessor);
        scriptProcessor.connect(audioContext.destination);
        console.log("ScriptProcessorNode created and connected.");

        // Initialize aubio and the Pitch detector
        const { Pitch } = await aubio();
        pitchDetector = new Pitch(
          "fcomb",
          scriptProcessor.bufferSize * 4,
          scriptProcessor.bufferSize,
          audioContext.sampleRate
        );
        console.log("Pitch detector initialized.");

        scriptProcessor.addEventListener("audioprocess", function (event) {
          redraw();
        });
      } catch (err) {
        console.error("Error:", err);
      }
    }


    // Third Path
    // Initialize points3 with given notes

    let points3 = [];

    const minFreq = frequencies[0];
    const maxFreq = frequencies[frequencies.length - 1];
    const givenPoints = givenNotes.length;



    // Calculate the x and y coordinates for each given note
    let notePoints = givenNotes.map((note, index) => {
      const y = map(indianNotesWithFrequencies[note], minFreq, maxFreq, height, 0);
      return { x: 0, y }; // Initialize x to 0, will adjust later
    });

    // Ensure the first point is at x = 0 and the last point is at x = width
    if (notePoints.length > 0) {
      notePoints[0].x = 0;
      notePoints[notePoints.length - 1].x = windowWidth;

      const xSpacing = windowWidth / (givenPoints - 1); // Calculate spacing between points

      for (let i = 1; i < notePoints.length - 1; i++) {
        notePoints[i].x = xSpacing * i;
      }
    }

    // Interpolate between the given notes to create a smooth curve
    points3 = cubicSplineInterpolation(notePoints, (500 / givenPoints));

    // Push the new path into the paths array
    paths.push(new Path(points3));

    
  //  pathFollower = new PathFollower(paths[currentPathIndex], 0.5);
   
    // Plot the note points
    notePoints.forEach(point => {
      ellipse(point.x, point.y, 5, 5); // Example of drawing a point
    });

    

  }, { once: true }); // Ensure the event listener is only triggered once


 
}





function draw() {
 // console.log("starting drawing");
  background(16, 16, 12); // Clear the background

  if (!frequencies || frequencies.length === 0) {
    return; // Wait until frequencies are loaded
  }

  const minFreq = frequencies[0];
  const maxFreq = frequencies[frequencies.length - 1];

  const y = mapper.mapFrequencyToHeight(440);
  console.log("mapf2h", y);
  fill(255, 0, 0);
  ellipse(100, y, 20, 20);

  const freq = mapper.mapHeightToFrequency(y)
  console.log("freq is ", freq);

  

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
  stroke(128, 255, 128); // Set stroke color to green
  strokeWeight(2); // Set stroke weight
  drawingContext.setLineDash([5, 5]); // Solid line
  positiveOffsetPath.draw();

  // Dashed Line
  stroke(128, 255, 128); // Set stroke color to green
  strokeWeight(2); // Set stroke weight
  drawingContext.setLineDash([5, 5]); // Dashed line
  negativeOffsetPath.draw();

  // Reset line dash for other drawings
  drawingContext.setLineDash([]);


 
  
  
 
  const data = event.inputBuffer.getChannelData(0);
  const rawFrequency = pitchDetector.do(data); // Frequency without smoothing
 
    pathCompleted = gameF.update(rawFrequency);
  
   position =  gameF.getPosition();
    
     
      ball.update(position);
      ball.draw();
     
      arrow.update(position);
      arrow.draw();

  // Switch to the next path if the current path is completed
  if (pathCompleted) {
    currentPathIndex = (currentPathIndex + 1) % paths.length;
    pathFollower = new PathFollower(paths[currentPathIndex], 0.5);
  }

  for (let i = 0; i < frequencies.length; i++) {
    let y = map(frequencies[i], minFreq, maxFreq, height, 0);
    fill(255); // Set fill color to white 
    text(`${notes[i]} (${frequencies[i].toFixed(2)} Hz)`, width / 2 + 20, y);
    
    // Draw pale horizontal line
    stroke(100, 100, 100, 100); // Set stroke color to white with alpha 100 (pale)
    line(0, y, width, y);
  }
  

}


