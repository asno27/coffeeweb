import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, addDoc, doc, setDoc } from "firebase/firestore";

// Old Project (Source)
const oldApp = initializeApp({
    apiKey: "AIzaSyAfcn90J0J_Y8kynjXhLd_9mdLeUo5wOdY",
    projectId: "coffee-f70dc"
}, "oldApp");
const oldDb = getFirestore(oldApp);

// New Project (Destination)
const newApp = initializeApp({
    projectId: "coffee-web-508305",
    apiKey: "AIzaSyDfYAWl3rDxWFIb56nNImGTWTJ9KWXSeTk"
}, "newApp");
const newDb = getFirestore(newApp);

async function migrate() {
    try {
        console.log("Fetching data from old project...");
        const oldDocs = await getDocs(collection(oldDb, "beans"));
        
        console.log(`Found ${oldDocs.size} records. Migrating to new project...`);
        let count = 0;
        
        for (const document of oldDocs.docs) {
            const data = document.data();
            // We will set the old imageUrl to empty string so it doesn't show broken images
            const newData = { ...data, imageUrl: "" }; 
            
            // Write to new DB using the same document ID (or a new one, doesn't matter)
            await setDoc(doc(newDb, "beans", document.id), newData);
            count++;
            console.log(`Migrated: ${data.beanName}`);
        }
        
        console.log(`Successfully migrated ${count} records!`);
    } catch (e) {
        console.error("Migration failed:", e);
    }
}
migrate();
