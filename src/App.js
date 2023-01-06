import React, { useEffect, useRef, useState } from 'react';
import logo from './logo.svg';
import './App.css';
import alarm from './assets/canhbao.mp3';
import { randomUniform } from '@tensorflow/tfjs';
import { initNotifications, notify } from '@mycv/f8-notification';
const bitclogo = require('./assets/bitclogo.png');
const tf = require('@tensorflow/tfjs');
const mobilenetModule = require('@tensorflow-models/mobilenet');
const knnClassifier = require('@tensorflow-models/knn-classifier');

const { Howl } = require('howler');

var sound = new Howl({
  src: [alarm]
});

const not_touch_label = 'not_touch';
const touched_label = 'touched';
const training_time = 50;
const touched_confidence = 0.8;

function App() {
  const video = useRef();
  const classifier = useRef();
  const canPlaySound = useRef(true);
  const mobilenet = useRef();
  const [touched, setTouched] = useState(false);

  const init = async () => {
    console.log('init...');
    await SetupCamera();

    console.log('Setup complete');

    // Create the classifier.
    classifier.current = knnClassifier.create();

    // Load mobilenet.
    mobilenet.current = await mobilenetModule.load();

    console.log('Do not touch your face and press Case 1');
    alert('System is ready to learn');

    initNotifications({ cooldown: 3000 });
  }

  const SetupCamera = () => {
    return new Promise((resolve, reject) => {
      navigator.getUserMedia = navigator.getUserMedia ||
        navigator.webkitGetUserMedia ||
        navigator.mozGetUserMedia ||
        navigator.msGetUserMedia;

      if (navigator.getUserMedia) {
        navigator.getUserMedia(
          { video: true },
          stream => {
            video.current.srcObject = stream;
            video.current.addEventListener('loadeddata', resolve);
          },
          error => reject(error)
        )
      }
    });
  }

  const train = async label => {
    console.log(`[${label}] System is learning...`);
    alert(`[${label}] System is learning`)
    for (let i = 0; i < training_time; ++i) {
      console.log(`Progress ${parseInt((i + 1) / training_time * 100)}%`);
      await training(label);
    } alert('Finished learning');
  }

  const training = label => {
    return new Promise(async resolve => {
      const embedding = mobilenet.current.infer(
        video.current,
        true
      );
      classifier.current.addExample(embedding, label);
      await sleep(100);
      resolve();
    })
  }

  const run = async () => {
    const embedding = mobilenet.current.infer(
      video.current,
      true
    );
    const result = await classifier.current.predictClass(embedding);

    if (
      result.label === touched_label &&
      result.confidences[result.label] > touched_confidence
    ) {
      console.log('Touched');
      if (canPlaySound.current) {
        canPlaySound.current = false;
        sound.play();
      }
      notify('Hand off !!!', { body: 'You just touched your face' });
      setTouched(true);
    } else {
      console.log('Not touched');
      setTouched(false);
    }

    await sleep(200);

    run();
  }

  const sleep = (ms = 0) => {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  useEffect(() => {
    init();

    sound.on('end', function () {
      canPlaySound.current = true;
    });

    // cleanup
    return () => {

    }
  }, []);

  return (
    <div className={`main ${touched ? 'touched' : ''}`}>
      <img src={bitclogo} alt="React Logo" className='bitclogo' />
      <p className='text'>Tool cảnh báo chạm tay vào mặt (Covid-19)</p>
      <video className="video" autoPlay ref={video}></video>
      <div className="control">
        <button className="btn" onClick={() => train(not_touch_label)}>Case 1: Không chạm tay vào mặt</button>
        <button className="btn" onClick={() => train(touched_label)}>Case 2: Để tay cách mặt 10 cm rồi bắt đầu chạm tay vào mặt</button>
        <button className="btn" onClick={() => run()}>Run</button>
      </div>
    </div>
  );
}

export default App;
