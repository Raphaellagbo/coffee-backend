const admin = require('firebase-admin');
const webpush = require('web-push');
const express = require('express');

// 1. VAPID KEYS (Gamitin mo yung dating Keys mo)
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

// 3. MONITORING LOGIC
db.ref('/drying').on('value', async (snapshot) => {
    const data = snapshot.val();
    if (!data || data.temp_left < 40) return; // Alert lang pag mainit

    const subSnapshot = await db.ref('/settings/pushSubscription').once('value');
    const subscription = subSnapshot.val();
    if (!subscription) return;

    const payload = JSON.stringify({
        title: "🚨 Coffee Alert!",
        body: `Temperature: ${data.temp_left}°C. Please check!`,
    });

    webpush.sendNotification(subscription, payload).catch(err => console.error("Push Error:", err));
});