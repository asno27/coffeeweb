import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyAfcn90J0J_Y8kynjXhLd_9mdLeUo5wOdY",
    authDomain: "coffee-f70dc.firebaseapp.com",
    projectId: "coffee-f70dc",
    storageBucket: "coffee-f70dc.firebasestorage.app",
    messagingSenderId: "898551556058",
    appId: "1:898551556058:web:e54ad77b7c377d03d442e3"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function check() {
    const q = collection(db, "beans");
    const snapshot = await getDocs(q);
    snapshot.forEach(doc => {
        const data = doc.data();
        console.log(`ID: ${doc.id}, Name: ${data.beanName}, HasImage: ${!!data.imageUrl}, ImageUrl: ${data.imageUrl}`);
    });
}
check();
