const admin = require('firebase-admin');
const webpush = require('web-push');
const express = require('express');

// 1. VAPID KEYS
const publicVapidKey = 'BKzbzHHpLEicyoSXxcA-sMBxJM795kH9UU_3AahwVNEIkXgCcZv4eHcXtSe1_tVeSWbueV1-UNTP9LWQnvDpVK0';
const privateVapidKey = '_0l2gPVXVPTxs1FxTIqj2Q-fCLPLSmeZjcErlPZXYHI';

webpush.setVapidDetails('mailto:leorenxz.1@gmail.com', publicVapidKey, privateVapidKey);

// 2. FIREBASE ADMIN (Basahin mula sa Secret File ng Render)
const serviceAccount = require('/etc/secrets/serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: "https://coffee-dashboard-2a8ce-default-rtdb.firebaseio.com"
    });
}

const db = admin.database();
const app = express();
app.get('/', (req, res) => res.send('Coffee Backend is Online! ☕'));
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));

// 3. MULTI-DEVICE MONITORING LOGIC
db.ref('/drying').on('value', async (snapshot) => {
    const data = snapshot.val();
    if (!data || data.temp_left < 40) return; // Alert lang pag mainit

    // Kukunin na natin ngayon ang BUONG LISTAHAN ng mga devices
    const subSnapshot = await db.ref('/pushSubscriptions').once('value');
    const subscriptions = subSnapshot.val();

    // Kung walang nag-allow ng notification, wag ituloy
    if (!subscriptions) return;

    const payload = JSON.stringify({
        title: "🚨 Coffee Alert!",
        body: `Temperature: ${data.temp_left}°C. Please check!`,
    });

    // I-loop ang lahat ng devices na naka-save sa database
    const sendPromises = Object.entries(subscriptions).map(([deviceKey, subData]) => {
        return webpush.sendNotification(subData, payload)
            .then(() => console.log(`[Push Success] Alert sent to device: ${deviceKey}`))
            .catch(err => {
                console.error(`[Push Error] Failed for device ${deviceKey}:`, err.statusCode);
                // AUTO-CLEANUP: Kung 410 (Gone) o 404 (Not Found), ibig sabihin nag-clear data ang user.
                // Burahin na natin sa Firebase para hindi mag-ipon ng dead subscriptions.
                if (err.statusCode === 410 || err.statusCode === 404) {
                    console.log(`[Auto-Cleanup] Deleting inactive subscription: ${deviceKey}`);
                    return db.ref(`/pushSubscriptions/${deviceKey}`).remove();
                }
            });
    });

    // Hintayin matapos mag-send sa lahat ng devices
    await Promise.all(sendPromises);
});