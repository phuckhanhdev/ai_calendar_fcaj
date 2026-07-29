/**
 * AWS Lambda Function - Báo lịch hàng ngày tự động (Daily Agenda Reminder)
 * 
 * Lưu ý: File này được lưu trữ trong mã nguồn dự án làm mẫu tham khảo.
 * Khi deploy lên AWS Lambda, bạn hãy zip file này cùng với thư mục `node_modules` có chứa `mysql2`
 * và `@aws-sdk/client-ses`, hoặc tạo một Lambda Layer chứa mysql2.
 */

const mysql = require("mysql2/promise");
const { SESClient, SendEmailCommand } = require("@aws-sdk/client-ses");

const ses = new SESClient({ region: process.env.AWS_REGION || "us-east-1" });

exports.handler = async (event) => {
  console.log("⏰ Starting Daily Agenda Reminder Lambda Function...");

  let connection;
  try {
    // 1. Kết nối tới database RDS MySQL
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || "3306"),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });

    console.log("✅ Connected to RDS Database.");

    // 2. Lấy danh sách lịch hẹn trong ngày hôm nay của tất cả người dùng
    // Sử dụng múi giờ Việt Nam (UTC+7) hoặc múi giờ hệ thống để lọc
    const todaySql = `
      SELECT 
        u.User_ID AS userId, 
        u.Email AS email, 
        CONCAT(u.FName, ' ', u.LName) AS fullName,
        e.Title AS eventTitle,
        DATE_FORMAT(e.Start_Time, '%H:%i') AS startTime,
        e.Location AS location
      FROM \`USER\` u
      JOIN \`EVENT\` e ON u.User_ID = e.User_ID
      WHERE DATE(e.Start_Time) = CURDATE()
      ORDER BY u.User_ID, e.Start_Time ASC
    `;

    const [rows] = await connection.query(todaySql);
    console.log(`📊 Found ${rows.length} events for today.`);

    if (rows.length === 0) {
      console.log("ℹ️ No events scheduled for today. Exiting.");
      return { statusCode: 200, body: "No reminders to send." };
    }

    // 3. Gom nhóm sự kiện theo từng User
    const userAgendas = {};
    rows.forEach((row) => {
      if (!userAgendas[row.userId]) {
        userAgendas[row.userId] = {
          email: row.email,
          fullName: row.fullName,
          events: [],
        };
      }
      userAgendas[row.userId].events.push(row);
    });

    // 4. Gửi email thông báo cho từng người dùng qua Amazon SES
    const senderEmail = process.env.SMTP_FROM || "no-reply@aicalendar.com";
    
    for (const userId of Object.keys(userAgendas)) {
      const agenda = userAgendas[userId];
      
      const emailBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
          <div style="background-color: #F47521; color: white; padding: 20px; text-align: center;">
            <h2>📅 LỊCH TRÌNH HÀNG NGÀY</h2>
          </div>
          <div style="padding: 24px; color: #333333;">
            <p>Xin chào <b>${agenda.fullName}</b>,</p>
            <p>Dưới đây là tóm tắt danh sách các sự kiện và lịch trình của bạn trong ngày hôm nay:</p>
            
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <thead>
                <tr style="background-color: #f2f2f2; text-align: left;">
                  <th style="padding: 10px; border-bottom: 2px solid #ddd;">Thời gian</th>
                  <th style="padding: 10px; border-bottom: 2px solid #ddd;">Sự kiện</th>
                  <th style="padding: 10px; border-bottom: 2px solid #ddd;">Địa điểm</th>
                </tr>
              </thead>
              <tbody>
                ${agenda.events.map(evt => `
                  <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><b>${evt.startTime}</b></td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">${evt.eventTitle}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">${evt.location || "Không có"}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            
            <p>Chúc bạn có một ngày làm việc hiệu quả!</p>
          </div>
          <div style="background-color: #f9f9f9; padding: 15px; text-align: center; font-size: 12px; color: #888; border-top: 1px solid #eee;">
            Gửi tự động từ AI Destiny Calendar qua AWS Lambda
          </div>
        </div>
      `;

      const sendCommand = new SendEmailCommand({
        Destination: { ToAddresses: [agenda.email] },
        Message: {
          Body: { Html: { Charset: "UTF-8", Data: emailBody } },
          Subject: { Charset: "UTF-8", Data: `[AI Calendar] Lịch trình của bạn hôm nay - ${new Date().toLocaleDateString("vi-VN")}` },
        },
        Source: senderEmail,
      });

      try {
        await ses.send(sendCommand);
        console.log(`✉️ Email reminder sent successfully to ${agenda.email}`);
      } catch (sesError) {
        console.error(`❌ Failed to send email to ${agenda.email}:`, sesError.message);
      }
    }

    return { statusCode: 200, body: `Successfully sent reminders to ${Object.keys(userAgendas).length} users.` };

  } catch (error) {
    console.error("❌ Lambda execution error:", error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};
