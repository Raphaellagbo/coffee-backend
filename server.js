const admin = require('firebase-admin');
const webpush = require('web-push');
const express = require('express');

// ============================================================================
// 1. VAPID KEYS SETUP
// ============================================================================
const publicVapidKey = 'BKzbzHHpLEicyoSXxcA-sMBxJM795kH9UU_3AahwVNEIkXgCcZv4eHcXtSe1_tVeSWbueV1-UNTP9LWQnvDpVK0';
const privateVapidKey = '_0l2gPVXVPTxs1FxTIqj2Q-fCLPLSmeZjcErlPZXYHI';

webpush.setVapidDetails('mailto:leorenxz.1@gmail.com', publicVapidKey, privateVapidKey);

// ============================================================================
// 2. FIREBASE ADMIN & SERVER SETUP
// ============================================================================
const serviceAccount = require('/etc/secrets/serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: "https://coffee-dashboard-2a8ce-default-rtdb.firebaseio.com"
    });
}

const db = admin.database();
const app = express();
app.get('/', (req, res) => res.send('Coffee Backend is Online - ALL ALERTS ENABLED! ☕🚀'));
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));

// ============================================================================
// 3. ADVANCED MULTI-DEVICE MONITORING LOGIC
// ============================================================================
const sendPushToAll = async (title, body) => {
    const subSnapshot = await db.ref('/pushSubscriptions').once('value');
    const subscriptions = subSnapshot.val();

    if (!subscriptions) return;

    const payload = JSON.stringify({ title, body });

    const sendPromises = Object.entries(subscriptions).map(([deviceKey, subData]) => {
        return webpush.sendNotification(subData, payload)
            .then(() => console.log(`[Push Success] Sent to: ${deviceKey} - ${title}`))
            .catch(err => {
                console.error(`[Push Error] Device ${deviceKey}:`, err.statusCode);
                if (err.statusCode === 410 || err.statusCode === 404) {
                    console.log(`[Auto-Cleanup] Deleting inactive ID: ${deviceKey}`);
                    return db.ref(`/pushSubscriptions/${deviceKey}`).remove();
                }
            });
    });

    await Promise.all(sendPromises);
};

// ---------------------------------------------------------
// A. DRYING STAGE MONITOR (Temp, Moisture, & Sensor Errors)
// ---------------------------------------------------------
let lastDryingAlert = 0;
let lastSensorErrorAlert = 0;

db.ref('/drying').on('value', async (snapshot) => {
    const data = snapshot.val();
    if (!data) return;

    const now = Date.now();

    // 1. SENSOR ERROR / MISMATCH ALERT (Every 5 mins max para hindi nakakabaliw)
    if (data.temp_left && data.temp_right && Math.abs(data.temp_left - data.temp_right) > 3.0) {
        if (now - lastSensorErrorAlert > 300000) {
            lastSensorErrorAlert = now;
            await sendPushToAll("⚠️ Sensor Mismatch", `Left: ${data.temp_left}°C | Right: ${data.temp_right}°C. Check sensor placement.`);
        }
    }

    // Anti-spam para sa normal drying alerts (Every 1 min)
    if (now - lastDryingAlert < 60000) return;

    let alertMsg = null;
    let title = "🚨 Drying Alert!";

    // 2. FERMENTATION & TEMP ALERTS
    if ((data.temp_left && data.temp_left >= 40) || (data.temp_right && data.temp_right >= 40) || data.ferment_risk) {
        title = "⚠️ Heat & Fermentation Risk!";
        alertMsg = `High Temp detected! Left: ${data.temp_left || 0}°C | Right: ${data.temp_right || 0}°C. Increase airflow!`;
    }
    // 3. OVER-DRIED ALERT
    else if (data.sensor_moisture > 0 && data.sensor_moisture < 10.0) {
        title = "🚨 CRITICAL: OVER-DRIED!";
        alertMsg = `Moisture dropped to ${data.sensor_moisture.toFixed(1)}%. Remove beans immediately!`;
    }
    // 4. DRYING COMPLETE ALERT
    else if (data.sensor_moisture >= 10.0 && data.sensor_moisture <= 12.5) {
        title = "✅ DRYING COMPLETE!";
        alertMsg = `Target reached! Moisture is at ${data.sensor_moisture.toFixed(1)}%. Ready for harvest.`;
    }

    if (alertMsg) {
        lastDryingAlert = now;
        await sendPushToAll(title, alertMsg);
    }
});

// ---------------------------------------------------------
// B. ROASTING STAGE MONITOR (Progress & Burnt Risk)
// ---------------------------------------------------------
let lastKnownRoastStage = "";
let lastRoastBurntAlert = 0;

db.ref('/roaster').on('value', async (snapshot) => {
    const data = snapshot.val();
    if (!data || !data.temperature || !data.stage) return;

    const now = Date.now();

    // 1. ROASTING PROGRESS ALERTS (Nagbabago ang stage)
    // Magse-send lang ng notif kung iba na ang stage sa nakaraan, para hindi spam.
    if (data.stage !== lastKnownRoastStage && data.stage !== "STANDBY" && data.stage !== "WARM UP" && data.stage !== "SENSOR ERROR") {
        lastKnownRoastStage = data.stage;

        // Tutunog lang sa mga importanteng stages
        if (["MAILLARD", "1st CRACK", "2nd CRACK"].includes(data.stage)) {
            await sendPushToAll(
                `☕ Roasting: ${data.stage}`,
                `Temperature is now ${data.temperature}°C. The beans have entered the ${data.stage} phase.`
            );
        }
    }

    // 2. BURNT RISK / CRITICAL ALERT (Every 1 min max)
    if (data.temperature >= 224) {
        if (now - lastRoastBurntAlert > 60000) {
            lastRoastBurntAlert = now;
            await sendPushToAll(
                "🔥 Roasting CRITICAL!",
                `Burnt risk! Temp reached ${data.temperature}°C. Drop beans NOW!`
            );
        }
    }
});