// import './style.css'
const video = document.querySelector('video')

navigator.mediaDevices.getDisplayMedia({
    audio: true,
    video: {
      width: 500,
    }
}).then(stream => {
    video.srcObject = stream
    video.onloadedmetadata = (e) => video.play()
}).catch(e => console.log(e))

// stopButton.addEventListener('click', () => {
//   video.pause()
// })