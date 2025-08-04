const video = document.querySelector('video')

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { getFirestore, getDoc, collection, setDoc, doc, onSnapshot, addDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js"


// Change your firebase config
// Create your own Firebase project, set up your own Firestore, then config it here. 
const firebaseConfig = {
  apiKey: "AIzaSyCGGgiJUYXy-LIW6YdQRhDXJYc5CWsq_OE",
  authDomain: "desktop-control-46b64.firebaseapp.com",
  projectId: "desktop-control-46b64",
  storageBucket: "desktop-control-46b64.firebasestorage.app",
  messagingSenderId: "95801441442",
  appId: "1:95801441442:web:2ed1fca0974d50115aabfb",
  measurementId: "G-KTD4WK0YLZ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const servers = {
  iceServers: [
      {
          urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302']
      }
  ],
  iceCandidatePoolSize: 10,
}

// Global states

let pc = new RTCPeerConnection(servers);

let remoteStream = new MediaStream();

pc.ontrack = (e) => {
  e.streams[0].getTracks().forEach(track => {
    remoteStream.addTrack(track);
    // console.log("Got track: ", track);
  })
};

let remoteChannel;

pc.ondatachannel = (event) => {
  remoteChannel = event.channel;

  remoteChannel.onopen = () => {
    let timeoutId;

    const videoBox = document.getElementById("remote");

    videoBox.addEventListener('mousemove', (event) => {
      const rect = videoBox.getBoundingClientRect(); // Get element's position on the page
      const x = event.clientX - rect.left; // Mouse X relative to element
      const y = event.clientY - rect.top;
      
      // Scale to 1920x1080 virtual resolution
      const virtualX = (x / rect.width) * 1920;
      const virtualY = (y / rect.height) * 1080;

      remoteChannel.send(JSON.stringify({x: virtualX.toFixed(0), y: virtualY.toFixed(0)}));
    });
  };
};

document.getElementById('remote').srcObject = remoteStream;

const answerButton = document.getElementById("answerButton");

answerButton.addEventListener('click', async (e) => {
  e.preventDefault();

  const answerId = document.getElementById("answerId").value;
  const callDocRef = doc(db, "calls", answerId)
  const callDoc = await getDoc(callDocRef);
  const offer = callDoc.data();

  const answerCandidateRef = await collection(callDocRef, "answerCandidates");
  const offerCandidateRef = await collection(callDocRef, "offerCandidates");


  pc.onicecandidate = event => {
  if (event.candidate) {
      addDoc(answerCandidateRef, event.candidate.toJSON())
      // .then(console.log("Added answer candidate."))
      // .catch(e => {console.log("Something happended! Error: ", e)});
      // console.log(event.candidate.toJSON());
    }
  }


  await pc.setRemoteDescription(offer);
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer)
  .then(async () => {
    await setDoc(callDocRef, answer);
    console.log("Answered call");
  })
  .catch(e => console.log(e));
  // console.log(callDoc.data());

  const snapshotRemoteCandidate = onSnapshot(offerCandidateRef, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === "added") {
        pc.addIceCandidate(change.doc.data());
        // console.log(change.doc.data());
      }
    })
  })

  const videoBox = document.getElementById("remote");
  const cursorRef = await doc(collection(callDocRef, "mouse"), "mousePosition");
})

const callDocsRef = collection(db, "calls");

const getIds = onSnapshot(callDocsRef, (snapshot) => {
  snapshot.docChanges().forEach((change) => {
    if (change.type === "added") {
      const id = change.doc.id;
      const type = change.doc.data().type;
      if (type === "offer") {
        const newDiv = document.createElement('div');
        newDiv.textContent = "New offer ID: " + id;
        newDiv.className = "callerId";
        document.getElementById("callerIds").prepend(newDiv);
      }
    }
  })
})