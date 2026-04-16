const admin = require('firebase-admin');
const webpush = require('web-push');
const express = require('express'); // Para hindi patayin ng Render ang server natin

// 1. SETUP VAPID KEYS (Palitan ng keys mo mula sa Step 1)
const publicVapidKey = 'BKzbzHHpLEicyoSXxcA-sMBxJM795kH9UU_3AahwVNEIkXgCcZv4eHcXtSe1_tVeSWbueV1-UNTP9LWQnvDpVK0';
const privateVapidKey = '_0l2gPVXVPTxs1FxTIqj2Q-fCLPLSmeZjcErlPZXYHI';
webpush.setVapidDetails(
    'mailto:leorenxz.1@gmail.com',
    publicVapidKey,
    privateVapidKey
);

/// 2. SETUP FIREBASE ADMIN
// 2. SETUP FIREBASE ADMIN
const serviceAccount = require('/etc/secrets/serviceAccountKey.json');

// DIREKTANG I-PASTE DITO ANG PRIVATE KEY
// Siguraduhin na ang format ay katulad nito: "-----BEGIN... \n ...END-----\n"
const myPrivateKey = "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCzcs5wEw84fFt+\noy/lSWtHgIkeVIVFgd5g7DBHKTJ9RSbNlfwTApuG7oP8loT+UoYd2GF9Axa8NaCV\nEw0nNebS2FTthIRp+KiqCyOb5MjYdmAxb8s/XDPoLswWkQlXwuDJIEXll5353aJM\nD4kn79emU4N7b3816cxIFT3zRL22asB0JX0pHg0har8Mh0fo2krSl0ulaJXefWzM\ngMNFUT8UonEwMZnUc2yO6kzgQu4NHpmeqynlOOyD3qEuh5X+IbzRk0Zh0Q9VprZF\nPye0Q0GCqSIxY0WaFSPpY0lDLGPl5UxRp8nx4XMNw/DBMGCZhAF9ilQ8TLRGqPVU\n4Bz8ZuUbAgMBAAECggEAJ1HImhYTB7V39s+a9wqXTxuC7/plGU3ThDk8ets0DO7S\nCcoLab7whShOE1KH4ZIDgRaghdvfZ234ubFq+GR/J0Pvl/upZ+7sRhYav1XqDEQj\n37E3P7LcTMu0PF2bRneU+Xzw09Xc75r4rOHak72h6vfxn2JW5WFNOZ4t7NfrGcT8\naO9deMw9BhEgCENNquNmPzHbnh5WT/RWSQkSF33dmCpWEWeKbI3pd1EAFkXQ2UU5\nGvY64/QKXmCPwjBR0oBAbzNEQgElt7D2GoHt3uZMEqnyq31NcfWSRxrFXzPuo0QQ\nUZsBQJzUqygCZzyxxFCt6gO7iyV1KCbE7QZ8iK5uQQKBgQDWXTzD5dVHr0P6qUrE\naftHsGvhxYi5SNuOkCsVPR/GF/lziOUBC0EdHv0OKVUatTrLuoi+YEbkV/nbSqsc\nioKhjcXbRvYjQc0on9yQ49qXPVT0YOaahC96YeXhx0sPFjEWfnvioGN6izoz+3cD\nymXP9/GvkRjKDag5Pv7XA/9ubwKBgQDWTXbxTxdST9A7Tn9Lw5gcVKeVhCLQNQhM\nq02jLtf10CoXixp4MihcwAjH7SlQJpQJyZ6JSaKfls4hQmpzaVDmOHg2q4Q3FHGf\slzgrPcWgEP3zsarq06yScnpFr2SlFOX/OZBPvxhDKbgAzVsMZ+mtMYKFyWlzveo\nw6vDfUWKFQKBgAxzyBbdIAGVBc7mzKgSO/2TGwE3d1TEDbT/XPFT5qecNupmNl9U\nJwkpBqwu7Hmrs2moQU9FynhzP9lkQgJbbXEzCh5NxfiQVvmYJ7jm84i7kFbN1jd9\nnEBwtWjjKdILiPh0in/Er2Kr+cqRPf2jYTyue4SmWhlKp84Dgcw9uDXTAoGBAMA5\nUeRXnkKt5skbuyEZe/qFkKCTmqqJtz0WNxiVbw9FvkvJ8V85Fm1Dr1ythW4ofIde\+z6H90ARBCpfKZ8GK5OluWbIaFsDknu9gIPjgesD+HNyXVAk4/0WJO9X/4lYVLcz\nGNITjkv7DkBHgIbg6CSfaDgq1REqWYleolZCqrqVAoGBAMq1MI4wLnEacSzUtS1i\nHpLN+SyyI2b6fXZ0AucYd/Of2GWS+xpDzvaLCHw11rU5J0UKEXW4TRwI2cmXR/g9\nNKUUPnv+Q5KauPlMMEASwopK9QW/Nm8SpVkXN5QsTJa1gB2qO02bnsvKLGsjuVWQ\nuJQKaoXFwA0djFp5vLAbKEpk\n-----END PRIVATE KEY-----\n";

admin.initializeApp({
    credential: admin.credential.cert({
        projectId: serviceAccount.project_id,
        clientEmail: serviceAccount.client_email,
        privateKey: myPrivateKey.replace(/\\n/g, '\n') // Double check na walang maling slash
    }),
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