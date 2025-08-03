// import './style.css'
const video = document.querySelector('video')
// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { getFirestore, getDoc, collection, setDoc, doc, onSnapshot, addDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js"
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyA6gkVmMcbZybHoAEWVD4bKa8Pllo-ARR8",
  authDomain: "webrtc-project-f6fa8.firebaseapp.com",
  projectId: "webrtc-project-f6fa8",
  storageBucket: "webrtc-project-f6fa8.firebasestorage.app",
  messagingSenderId: "1025853139038",
  appId: "1:1025853139038:web:e6b6752c0b0eaa12466ccf",
  measurementId: "G-0B51NWD63K"
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
    console.log("Got track: ", track);
  })
};

document.getElementById('remote').srcObject = remoteStream

const answerButton = document.getElementById("answerButton");

answerButton.addEventListener('click', async (e) => {
  e.preventDefault();

  const answerId = document.getElementById("answerId").value;
  const callDocRef = doc(db, "calls", answerId)
  const callDoc = await getDoc(callDocRef);
  const offer = callDoc.data();

  await pc.setRemoteDescription(offer);
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer)
  .then(async () => {
    await setDoc(callDocRef, answer);
    console.log("Answered call")
  })
  .catch(e => console.log(e));
  console.log(callDoc.data());

  const answerCandidateRef = await collection(callDocRef, "answerCandidates");
  const offerCandidateRef = await collection(callDocRef, "offerCandidates");


  pc.onicecandidate = event => {
    if (event.candidate) {
      addDoc(answerCandidateRef, event.candidate.toJSON())
      .then(console.log("Added answer candidate."))
      .catch(e => {console.log("Something happended! Error: ", e)});
    }
  }

  const snapshotRemoteCandidate = onSnapshot(offerCandidateRef, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === "added") {
        pc.addIceCandidate(change.doc.data());
        console.log(change.doc.data());
      }
    })
  })
})

// const stream = await navigator.mediaDevices.getDisplayMedia({video: true, audio: true});

// const uniqueId = generateUniqueId();

// console.log(uniqueId);
// document.getElementById("callId").textContent = uniqueId;

// const callDoc = await doc(db, "calls", uniqueId);
// const answerDoc = await doc(db, "calls", "answer");

// stream.getTracks().forEach(track => {
//   pc.addTrack(track, stream);
// })

// const offer = await pc.createOffer();
// try {
//   pc.setLocalDescription(offer).then( async () => {
//       const docRef = await setDoc(callDoc, offer);
//       console.log("Added offer description.")
//   });
// } catch(e) {
//   console.log("Error adding document: ", e)
// }

// const offerCandidateRef = await collection(callDoc, "offerCandidates");
// const answerCandidateRef = await collection(callDoc, "answerCandidates");

// pc.onicecandidate = event => {
//   if (event.candidate) {
//     addDoc(offerCandidateRef, event.candidate.toJSON())
//     .then(console.log("Added offer candidate."))
//     .catch(e => {console.log("Something happended! Error: ", e)});
//   }
// }

// const snapshotRef = onSnapshot(callDoc, (snapshot) => {
//   const answer = snapshot.data();
//   if (!pc.currentRemoteDescription && answer.type === "answer") {
//     pc.setRemoteDescription(answer);
//   }
// })

// const snapshotRemoteCandidate = onSnapshot(answerCandidateRef, (snapshot) => {
//   snapshot.docChanges().forEach((change) => {
//     if (change.type === "added") {
//       pc.addIceCandidate(change.doc.data());
//     }
//   })
// })