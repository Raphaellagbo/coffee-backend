const admin = require('firebase-admin');
const webpush = require('web-push');
const express = require('express'); // Para hindi patayin ng Render ang server natin

// 1. SETUP VAPID KEYS (Palitan ng keys mo mula sa Step 1)
const publicVapidKey = 'BKzbzHHpLEicyoSXxcA-sMBxJM795kH9UU_3AahwVNEIkXgCcZv4eHcXtSe1_tVeSWbueV1-UNTP9LWQnvDpVK0';
const privateVapidKey = '_0l2gPVXVPTxs1FxTIqj2Q-fCLPLSmeZjcErlPZXYHI';
webpush.setVapidDetails('leorenxz.1@gmail.com', publicVapidKey, privateVapidKey);

// 2. SETUP FIREBASE ADMIN
// Dapat ganito ang path para sa Render Secret Files
const serviceAccount = require('/etc/secrets/serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    // Siguraduhin na tama ang URL na ito mula sa Firebase Console mo:
    databaseURL: "https://coffee-dashboard-2a8ce-default-rtdb.firebaseio.com"
});

const db = admin.database();

// 3. EXPRESS SERVER (Kailangan ito para gumana sa libreng hosting)
const app = express();
app.get('/', (req, res) => res.send('Coffee Monitor Backend is Running! ☕'));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));

// 4. ANG 24/7 MONITORING LOGIC
let lastAlertSent = 0;

db.ref('/drying').on('value', async (snapshot) => {
    const data = snapshot.val();
    if (!data) return;

    // Kunin muna ang push subscription mula sa database
    const subSnapshot = await db.ref('/settings/pushSubscription').once('value');
    const subscription = subSnapshot.val();

    if (!subscription) return; // Walang naka-register na phone

    // Example Logic: Kapag sobrang init
    if (data.temp_left > 40.0) {
        const now = Date.now();
        // Mag-send lang every 5 minutes para hindi ma-spam ang phone mo
        if (now - lastAlertSent > 300000) {
            const payload = JSON.stringify({
                title: "🚨 CRITICAL: Kape is Overheating!",
                body: `Temperature is ${data.temp_left}°C. Check the roaster now!`,
            });

            webpush.sendNotification(subscription, payload).catch(err => console.error(err));
            lastAlertSent = now;
            console.log("Push notification sent!");
        }
    }
});