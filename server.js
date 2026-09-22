require('dotenv').config();
const http = require('http');
const fs = require('fs');
const path = require('path');
const https = require('https');
const nodemailer = require('nodemailer');

const PORT = process.env.PORT || 8000;
const SUBSCRIBERS_FILE = path.join(__dirname, 'subscribers.json');
const ORDERS_FILE = path.join(__dirname, 'orders.json');

const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

// Helper to send JSON responses
function sendJSON(res, statusCode, data) {
    res.writeHead(statusCode, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end(JSON.stringify(data));
}

// Nodemailer Newsletter Notification Service
function sendEmailNotification(subscriberEmail) {
    const emailUser = process.env.EMAIL_USER || 'sonusankhat011@gmail.com';
    const emailPass = process.env.EMAIL_PASSWORD;
    const adminEmail = process.env.ADMIN_EMAIL || 'sonusankhat011@gmail.com';

    if (!emailPass || emailPass.includes('your_') || emailPass.length < 5) {
        console.log(`[Email Notification] EMAIL_PASSWORD not configured in .env. Registered subscriber: ${subscriberEmail}`);
        return Promise.resolve({ success: true, skipped: true, reason: 'EMAIL_PASSWORD not configured' });
    }

    const transporter = nodemailer.createTransport({
        service: process.env.EMAIL_SERVICE || 'gmail',
        auth: {
            user: emailUser,
            pass: emailPass
        }
    });

    const mailOptions = {
        from: `"TRENDcart Club" <${emailUser}>`,
        to: adminEmail,
        subject: `🎉 New Newsletter Subscriber: ${subscriberEmail}`,
        text: `You have a new subscriber on TRENDcart!\n\nSubscriber Email: ${subscriberEmail}\nDate & Time: ${new Date().toLocaleString()}\n\nBest regards,\nTRENDcart Automated System`,
        html: `
            <div style="font-family: Arial, sans-serif; padding: 25px; color: #111; max-width: 600px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #ffffff;">
                <h2 style="color: #111; text-transform: uppercase; letter-spacing: 1px; margin-top: 0;">🎉 New TRENDcart Subscriber!</h2>
                <p style="font-size: 15px; color: #555; margin-bottom: 20px;">A new visitor has subscribed to the TRENDcart newsletter club.</p>
                <div style="background-color: #f9f9f9; padding: 18px; border-left: 4px solid #111; margin-bottom: 20px; border-radius: 4px;">
                    <p style="margin: 0 0 10px 0; font-size: 15px;"><strong>Subscriber Email:</strong> <a href="mailto:${subscriberEmail}" style="color: #111; text-decoration: underline;">${subscriberEmail}</a></p>
                    <p style="margin: 0; font-size: 14px; color: #666;"><strong>Subscribed Date:</strong> ${new Date().toLocaleString()}</p>
                </div>
                <p style="font-size: 12px; color: #888; margin-bottom: 0;">Sent automatically by your TRENDcart server to <strong>${adminEmail}</strong>.</p>
            </div>
        `
    };

    return transporter.sendMail(mailOptions)
        .then(info => {
            console.log(`[Email Sent Successfully] Notification delivered to ${adminEmail} (ID: ${info.messageId})`);
            return { success: true, info };
        })
        .catch(err => {
            console.error(`[Email Send Error] Failed to send email to ${adminEmail}:`, err.message);
            return { success: false, error: err.message };
        });
}

// Nodemailer Order Notification Service
function sendOrderEmailNotification(order) {
    const emailUser = process.env.EMAIL_USER || 'sonusankhat011@gmail.com';
    const emailPass = process.env.EMAIL_PASSWORD;
    const adminEmail = process.env.ADMIN_EMAIL || 'sonusankhat011@gmail.com';

    if (!emailPass || emailPass.includes('your_') || emailPass.length < 5) {
        console.log(`[Order Email Notification] EMAIL_PASSWORD not configured in .env. Order ID: ${order.id}`);
        return Promise.resolve({ success: true, skipped: true, reason: 'EMAIL_PASSWORD not configured' });
    }

    const transporter = nodemailer.createTransport({
        service: process.env.EMAIL_SERVICE || 'gmail',
        auth: {
            user: emailUser,
            pass: emailPass
        }
    });

    const itemsHtml = (order.items || []).map(item => `
        <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.title} (${item.color || 'Default'} / ${item.size || 'Default'})</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">x${item.quantity}</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">₹${Number(item.price * item.quantity).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
        </tr>
    `).join('');

    const mailOptions = {
        from: `"TRENDcart Orders" <${emailUser}>`,
        to: adminEmail,
        subject: `🛒 New Order Received: ${order.id} (₹${Number(order.total).toLocaleString('en-IN', { minimumFractionDigits: 2 })})`,
        text: `New Order Placed on TRENDcart!\nOrder ID: ${order.id}\nCustomer: ${order.shippingAddress?.fullName} (${order.shippingAddress?.email})\nTotal: ₹${order.total}\nPayment Method: ${order.paymentMethod}`,
        html: `
            <div style="font-family: Arial, sans-serif; padding: 25px; color: #111; max-width: 650px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #ffffff;">
                <h2 style="color: #111; text-transform: uppercase; letter-spacing: 1px; margin-top: 0;">🛒 New Order Placed!</h2>
                <div style="background-color: #f9f9f9; padding: 15px; border-left: 4px solid #111; margin-bottom: 20px;">
                    <p style="margin: 0 0 5px 0;"><strong>Order ID:</strong> ${order.id}</p>
                    <p style="margin: 0 0 5px 0;"><strong>Customer Name:</strong> ${order.shippingAddress?.fullName || 'N/A'}</p>
                    <p style="margin: 0 0 5px 0;"><strong>Customer Email:</strong> ${order.shippingAddress?.email || 'N/A'}</p>
                    <p style="margin: 0 0 5px 0;"><strong>Mobile:</strong> ${order.shippingAddress?.mobile || 'N/A'}</p>
                    <p style="margin: 0 0 5px 0;"><strong>Delivery Address:</strong> ${order.shippingAddress?.house || ''}, ${order.shippingAddress?.street || ''}, ${order.shippingAddress?.city || ''}, ${order.shippingAddress?.state || ''} - ${order.shippingAddress?.pincode || ''}, ${order.shippingAddress?.country || ''}</p>
                    <p style="margin: 0;"><strong>Payment Method:</strong> ${order.paymentMethod} (${order.paymentStatus})</p>
                </div>
                <h3>Order Items</h3>
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                    <thead>
                        <tr style="background-color: #eee; text-align: left;">
                            <th style="padding: 8px;">Item</th>
                            <th style="padding: 8px; text-align: center;">Qty</th>
                            <th style="padding: 8px; text-align: right;">Price</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsHtml}
                    </tbody>
                </table>
                <p style="font-size: 18px; font-weight: bold; text-align: right;">Total Amount: ₹${Number(order.total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
            </div>
        `
    };

    return transporter.sendMail(mailOptions)
        .then(info => {
            console.log(`[Order Email Sent] Order ${order.id} notification delivered to ${adminEmail}`);
            return { success: true, info };
        })
        .catch(err => {
            console.error(`[Order Email Error] Failed to send order notification:`, err.message);
            return { success: false, error: err.message };
        });
}

// Forward to Formspree if FORMSPREE_URL is set in environment
function forwardToFormspree(email, formspreeUrl) {
    return new Promise((resolve, reject) => {
        try {
            const urlObj = new URL(formspreeUrl);
            const postData = JSON.stringify({ email: email, _subject: "New TRENDcart Newsletter Subscription" });

            const options = {
                hostname: urlObj.hostname,
                port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
                path: urlObj.pathname + urlObj.search,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData),
                    'Accept': 'application/json'
                }
            };

            const req = (urlObj.protocol === 'https:' ? https : http).request(options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => resolve(res.statusCode < 400));
            });

            req.on('error', (err) => resolve(false));
            req.write(postData);
            req.end();
        } catch (err) {
            resolve(false);
        }
    });
}

const server = http.createServer((req, res) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        });
        res.end();
        return;
    }

    // Handle Newsletter Subscription API Endpoint
    if (req.method === 'POST' && req.url.startsWith('/api/subscribe')) {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
            if (body.length > 1e6) req.destroy();
        });

        req.on('end', async () => {
            try {
                const payload = JSON.parse(body || '{}');
                const email = (payload.email || '').trim().toLowerCase();

                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!email || !emailRegex.test(email)) {
                    return sendJSON(res, 400, {
                        success: false,
                        error: "Please enter a valid email address."
                    });
                }

                // Load existing subscribers
                let subscribers = [];
                if (fs.existsSync(SUBSCRIBERS_FILE)) {
                    try {
                        subscribers = JSON.parse(fs.readFileSync(SUBSCRIBERS_FILE, 'utf-8'));
                    } catch (e) {
                        subscribers = [];
                    }
                }

                const exists = subscribers.some(s => s.email === email);
                if (!exists) {
                    subscribers.push({
                        email: email,
                        subscribedAt: new Date().toISOString()
                    });
                    fs.writeFileSync(SUBSCRIBERS_FILE, JSON.stringify(subscribers, null, 2), 'utf-8');
                }

                const emailResult = await sendEmailNotification(email);

                const formspreeUrl = process.env.FORMSPREE_URL || payload.formspreeUrl;
                if (formspreeUrl) {
                    await forwardToFormspree(email, formspreeUrl);
                }

                return sendJSON(res, 200, {
                    success: true,
                    message: "Thank you for subscribing!",
                    alreadySubscribed: exists,
                    emailResult: emailResult
                });
            } catch (err) {
                return sendJSON(res, 500, {
                    success: false,
                    error: "Something went wrong. Please try again."
                });
            }
        });
        return;
    }

    // Handle Order Placement API Endpoint
    if (req.method === 'POST' && req.url.startsWith('/api/orders')) {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
            if (body.length > 1e6) req.destroy();
        });

        req.on('end', async () => {
            try {
                const orderPayload = JSON.parse(body || '{}');
                if (!orderPayload.id || !orderPayload.items || !orderPayload.items.length) {
                    return sendJSON(res, 400, {
                        success: false,
                        error: "Invalid order data provided."
                    });
                }

                // Save order to orders.json
                let orders = [];
                if (fs.existsSync(ORDERS_FILE)) {
                    try {
                        orders = JSON.parse(fs.readFileSync(ORDERS_FILE, 'utf-8'));
                    } catch (e) {
                        orders = [];
                    }
                }

                orders.unshift(orderPayload);
                fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2), 'utf-8');

                // Send email notification to ADMIN_EMAIL
                const emailResult = await sendOrderEmailNotification(orderPayload);

                return sendJSON(res, 200, {
                    success: true,
                    message: "Order recorded successfully!",
                    orderId: orderPayload.id,
                    emailResult: emailResult
                });
            } catch (err) {
                return sendJSON(res, 500, {
                    success: false,
                    error: "Failed to record order on server."
                });
            }
        });
        return;
    }

    // Safe Static File Server Logic
    const safePath = path.normalize(decodeURIComponent(req.url)).replace(/^(\.\.[\/\\])+/, '');
    let filePath = path.join(__dirname, safePath);
    
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
        filePath = path.join(filePath, 'index.html');
    }

    const extname = String(path.extname(filePath)).toLowerCase();
    const contentType = MIME_TYPES[extname] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end('<h1>404 Not Found</h1>', 'utf-8');
            } else {
                res.writeHead(500);
                res.end('Sorry, check with the site admin for error: ' + error.code + ' ..\n');
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

// Process-level uncaught error handlers for maximum reliability
process.on('uncaughtException', (err) => {
    console.error('[Uncaught Exception]:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('[Unhandled Rejection]:', reason);
});

server.listen(PORT, () => {
    console.log(`Server running reliably at http://localhost:${PORT}/`);
    console.log(`Notification Recipient: ${process.env.ADMIN_EMAIL || 'sonusankhat011@gmail.com'}`);
});

