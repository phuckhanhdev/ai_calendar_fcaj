import fs from "fs";
import path from "path";
import crypto from "crypto";

// 1. Manually parse and load .env.local variables into process.env (ESM Top-Level)
try {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf-8");
    envContent.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return;
      const index = trimmed.indexOf("=");
      if (index > -1) {
        const key = trimmed.substring(0, index).trim();
        let val = trimmed.substring(index + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.substring(1, val.length - 1);
        }
        process.env[key] = val;
      }
    });
    console.log("✅ Loaded environment variables from .env.local manually.");
  }
} catch (e) {
  console.error("Failed to read .env.local:", e.message);
}

function runQuery(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
}

async function migrate() {
  console.log("🚀 Starting database migrations...");

  try {
    // 2. Dynamically import connection.js so process.env is already populated
    const { connectToDatabase } = await import("./connection.js");
    const db = connectToDatabase();

    // 3. Check if column 'Role' exists in 'USER' table
    const columns = await runQuery(db, "DESCRIBE `USER`");
    const hasRoleColumn = columns.some((col) => col.Field.toLowerCase() === "role");

    if (!hasRoleColumn) {
      console.log("➡️ Adding 'Role' column to 'USER' table...");
      await runQuery(db, "ALTER TABLE `USER` ADD COLUMN `Role` VARCHAR(20) DEFAULT 'user'");
      console.log("✅ 'Role' column added successfully.");
    } else {
      console.log("ℹ️ 'Role' column already exists in 'USER' table.");
    }

    // Check and add 'Avatar_URL' column in 'USER' table
    const hasAvatarColumn = columns.some((col) => col.Field.toLowerCase() === "avatar_url");
    if (!hasAvatarColumn) {
      console.log("➡️ Adding 'Avatar_URL' column to 'USER' table...");
      await runQuery(db, "ALTER TABLE `USER` ADD COLUMN `Avatar_URL` VARCHAR(500) NULL");
      console.log("✅ 'Avatar_URL' column added successfully.");
    } else {
      console.log("ℹ️ 'Avatar_URL' column already exists in 'USER' table.");
    }

    // Check and add 'Gender' column in 'USER' table
    const hasGenderColumn = columns.some((col) => col.Field.toLowerCase() === "gender");
    if (!hasGenderColumn) {
      console.log("➡️ Adding 'Gender' column to 'USER' table...");
      await runQuery(db, "ALTER TABLE `USER` ADD COLUMN `Gender` VARCHAR(10) DEFAULT 'Male'");
      console.log("✅ 'Gender' column added successfully.");
    } else {
      console.log("ℹ️ 'Gender' column already exists in 'USER' table.");
    }

    // Check and add 'Latitude' and 'Longitude' columns in 'USER' table
    const hasLatColumn = columns.some((col) => col.Field.toLowerCase() === "latitude");
    if (!hasLatColumn) {
      console.log("➡️ Adding 'Latitude' & 'Longitude' columns to 'USER' table...");
      await runQuery(db, "ALTER TABLE `USER` ADD COLUMN `Latitude` DECIMAL(10, 8) DEFAULT 10.7769, ADD COLUMN `Longitude` DECIMAL(11, 8) DEFAULT 106.7009");
      console.log("✅ Location columns added successfully.");
    } else {
      console.log("ℹ️ 'Latitude' & 'Longitude' columns already exist in 'USER' table.");
    }

    // 4. Create 'SYSTEM_SETTING' table
    console.log("➡️ Creating 'SYSTEM_SETTING' table...");
    await runQuery(db, `
      CREATE TABLE IF NOT EXISTS \`SYSTEM_SETTING\` (
        Setting_Key VARCHAR(100) PRIMARY KEY,
        Setting_Value TEXT NOT NULL,
        Updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
     `);
    console.log("✅ 'SYSTEM_SETTING' table ready.");

    // 5. Seed default banking settings
    console.log("➡️ Seeding default VietQR settings...");
    await runQuery(db, `
      INSERT INTO \`SYSTEM_SETTING\` (Setting_Key, Setting_Value) VALUES 
      ('ADMIN_BANK_ID', 'OCB'),
      ('ADMIN_BANK_ACCOUNT', '0949191399'),
      ('ADMIN_BANK_NAME', 'NGUYEN PHUC KHANH'),
      ('SUBSCRIPTION_PRICE', '99000')
      ON DUPLICATE KEY UPDATE Setting_Value = Setting_Value
    `);
    console.log("✅ Default VietQR settings seeded.");

    // 6. Create 'PAYMENT_TRANSACTION' table
    console.log("➡️ Creating 'PAYMENT_TRANSACTION' table...");
    await runQuery(db, `
      CREATE TABLE IF NOT EXISTS \`PAYMENT_TRANSACTION\` (
        Transaction_ID VARCHAR(255) PRIMARY KEY,
        User_ID VARCHAR(255) NOT NULL,
        Amount DECIMAL(10,2) NOT NULL,
        Status VARCHAR(20) DEFAULT 'completed',
        Transfer_Note TEXT NULL,
        Created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (User_ID) REFERENCES \`USER\`(User_ID) ON DELETE CASCADE
      )
    `);
    console.log("✅ 'PAYMENT_TRANSACTION' table ready.");
    
    // 6b. Check and add 'Requester_ID' to 'FRIENDSHIP' table
    try {
      const friendshipCols = await runQuery(db, "DESCRIBE `FRIENDSHIP`");
      const hasRequesterId = friendshipCols.some((col) => col.Field.toLowerCase() === "requester_id");
      if (!hasRequesterId) {
        console.log("➡️ Adding 'Requester_ID' column to 'FRIENDSHIP' table...");
        await runQuery(db, "ALTER TABLE `FRIENDSHIP` ADD COLUMN `Requester_ID` VARCHAR(255) NULL");
        await runQuery(db, "ALTER TABLE `FRIENDSHIP` ADD CONSTRAINT `fk_friendship_requester` FOREIGN KEY (`Requester_ID`) REFERENCES `USER`(`User_ID`) ON DELETE CASCADE");
        console.log("✅ 'Requester_ID' column added successfully.");
      } else {
        console.log("ℹ️ 'Requester_ID' column already exists in 'FRIENDSHIP' table.");
      }
    } catch (friendshipErr) {
      console.warn("⚠️ Could not run FRIENDSHIP column check/alter (table might not exist yet):", friendshipErr.message);
    }

    // Check and add Is_Private, Attachment_URL, Attachment_Name columns to EVENT table
    try {
      const eventCols = await runQuery(db, "DESCRIBE `EVENT`");
      const hasIsPrivate = eventCols.some((col) => col.Field.toLowerCase() === "is_private");
      if (!hasIsPrivate) {
        console.log("➡️ Adding 'Is_Private' column to 'EVENT' table...");
        await runQuery(db, "ALTER TABLE `EVENT` ADD COLUMN `Is_Private` TINYINT DEFAULT 0");
        console.log("✅ 'Is_Private' column added successfully.");
      } else {
        console.log("ℹ️ 'Is_Private' column already exists in 'EVENT' table.");
      }

      const hasAttachmentUrl = eventCols.some((col) => col.Field.toLowerCase() === "attachment_url");
      if (!hasAttachmentUrl) {
        console.log("➡️ Adding 'Attachment_URL' column to 'EVENT' table...");
        await runQuery(db, "ALTER TABLE `EVENT` ADD COLUMN `Attachment_URL` VARCHAR(500) NULL");
        console.log("✅ 'Attachment_URL' column added successfully.");
      }

      const hasAttachmentName = eventCols.some((col) => col.Field.toLowerCase() === "attachment_name");
      if (!hasAttachmentName) {
        console.log("➡️ Adding 'Attachment_Name' column to 'EVENT' table...");
        await runQuery(db, "ALTER TABLE `EVENT` ADD COLUMN `Attachment_Name` VARCHAR(255) NULL");
        console.log("✅ 'Attachment_Name' column added successfully.");
      }
    } catch (eventColErr) {
      console.warn("⚠️ Could not run EVENT column check/alter:", eventColErr.message);
    }

    // 6c. Check and add Composite Indexes for Performance Optimization
    try {
      const eventIndexes = await runQuery(db, "SHOW INDEX FROM `EVENT` WHERE Key_name = 'idx_user_start'");
      if (eventIndexes.length === 0) {
        console.log("➡️ Creating composite index 'idx_user_start' on 'EVENT' table...");
        await runQuery(db, "CREATE INDEX idx_user_start ON `EVENT` (User_ID, Start_Time)");
        console.log("✅ Index 'idx_user_start' created successfully.");
      } else {
        console.log("ℹ️ Index 'idx_user_start' already exists on 'EVENT' table.");
      }

      const chatIndexes = await runQuery(db, "SHOW INDEX FROM `CHAT_MESSAGE` WHERE Key_name = 'idx_user_created'");
      if (chatIndexes.length === 0) {
        console.log("➡️ Creating composite index 'idx_user_created' on 'CHAT_MESSAGE' table...");
        await runQuery(db, "CREATE INDEX idx_user_created ON `CHAT_MESSAGE` (User_ID, Created_at)");
        console.log("✅ Index 'idx_user_created' created successfully.");
      } else {
        console.log("ℹ️ Index 'idx_user_created' already exists on 'CHAT_MESSAGE' table.");
      }
    } catch (indexErr) {
      console.warn("⚠️ Could not run index check/alter:", indexErr.message);
    }

    // 6d. Create Group Scheduling tables
    try {
      console.log("➡️ Creating 'USER_DAILY_SCHEDULE' table...");
      await runQuery(db, `
        CREATE TABLE IF NOT EXISTS \`USER_DAILY_SCHEDULE\` (
          User_ID VARCHAR(255) NOT NULL,
          Date DATE NOT NULL,
          Busy_Slots BIGINT UNSIGNED DEFAULT 0,
          Created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          Updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (User_ID, Date),
          FOREIGN KEY (User_ID) REFERENCES \`USER\`(User_ID) ON DELETE CASCADE
        )
      `);
      
      const udsIndexes = await runQuery(db, "SHOW INDEX FROM `USER_DAILY_SCHEDULE` WHERE Key_name = 'idx_user_date'");
      if (udsIndexes.length === 0) {
        await runQuery(db, "CREATE INDEX idx_user_date ON `USER_DAILY_SCHEDULE` (User_ID, Date)");
      }
      console.log("✅ 'USER_DAILY_SCHEDULE' table ready.");

      console.log("➡️ Creating 'MEETING_REQUEST' table...");
      await runQuery(db, `
        CREATE TABLE IF NOT EXISTS \`MEETING_REQUEST\` (
          Meeting_Request_ID VARCHAR(255) PRIMARY KEY,
          Host_ID VARCHAR(255) NOT NULL,
          Title VARCHAR(255) NOT NULL,
          Duration_Minutes INT NOT NULL,
          Status VARCHAR(20) DEFAULT 'PENDING',
          Created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (Host_ID) REFERENCES \`USER\`(User_ID) ON DELETE CASCADE
        )
      `);
      console.log("✅ 'MEETING_REQUEST' table ready.");

      console.log("➡️ Creating 'MEETING_OPTION' table...");
      await runQuery(db, `
        CREATE TABLE IF NOT EXISTS \`MEETING_OPTION\` (
          Meeting_Option_ID VARCHAR(255) PRIMARY KEY,
          Meeting_Request_ID VARCHAR(255) NOT NULL,
          Start_Time DATETIME NOT NULL,
          End_Time DATETIME NOT NULL,
          Score INT DEFAULT 0,
          FOREIGN KEY (Meeting_Request_ID) REFERENCES \`MEETING_REQUEST\`(Meeting_Request_ID) ON DELETE CASCADE
        )
      `);
      console.log("✅ 'MEETING_OPTION' table ready.");

      console.log("➡️ Creating 'MEETING_PARTICIPANT' table...");
      await runQuery(db, `
        CREATE TABLE IF NOT EXISTS \`MEETING_PARTICIPANT\` (
          Meeting_Request_ID VARCHAR(255) NOT NULL,
          User_ID VARCHAR(255) NOT NULL,
          Status VARCHAR(20) DEFAULT 'INVITED',
          Updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (Meeting_Request_ID, User_ID),
          FOREIGN KEY (Meeting_Request_ID) REFERENCES \`MEETING_REQUEST\`(Meeting_Request_ID) ON DELETE CASCADE,
          FOREIGN KEY (User_ID) REFERENCES \`USER\`(User_ID) ON DELETE CASCADE
        )
      `);
      console.log("✅ 'MEETING_PARTICIPANT' table ready.");

      // Check and drop Voted_Option_ID or add Updated_at column in MEETING_PARTICIPANT
      try {
        const mpCols = await runQuery(db, "DESCRIBE `MEETING_PARTICIPANT`");
        
        const hasVotedOptionId = mpCols.some((col) => col.Field === "Voted_Option_ID");
        if (hasVotedOptionId) {
          console.log("➡️ Dropping 'Voted_Option_ID' column from 'MEETING_PARTICIPANT'...");
          await runQuery(db, "ALTER TABLE `MEETING_PARTICIPANT` DROP COLUMN `Voted_Option_ID`");
          console.log("✅ 'Voted_Option_ID' column dropped successfully.");
        }

        const hasUpdatedAt = mpCols.some((col) => col.Field === "Updated_at");
        if (!hasUpdatedAt) {
          console.log("➡️ Adding 'Updated_at' column to 'MEETING_PARTICIPANT'...");
          await runQuery(db, "ALTER TABLE `MEETING_PARTICIPANT` ADD COLUMN `Updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP");
          console.log("✅ 'Updated_at' column added successfully.");
        }
      } catch (mpAlterErr) {
        console.warn("⚠️ Could not alter MEETING_PARTICIPANT column:", mpAlterErr.message);
      }

      console.log("➡️ Creating 'MEETING_VOTE' table...");
      await runQuery(db, `
        CREATE TABLE IF NOT EXISTS \`MEETING_VOTE\` (
          Meeting_Request_ID VARCHAR(255) NOT NULL,
          User_ID VARCHAR(255) NOT NULL,
          Meeting_Option_ID VARCHAR(255) NOT NULL,
          PRIMARY KEY (Meeting_Request_ID, User_ID, Meeting_Option_ID),
          FOREIGN KEY (Meeting_Request_ID) REFERENCES \`MEETING_REQUEST\`(Meeting_Request_ID) ON DELETE CASCADE,
          FOREIGN KEY (User_ID) REFERENCES \`USER\`(User_ID) ON DELETE CASCADE,
          FOREIGN KEY (Meeting_Option_ID) REFERENCES \`MEETING_OPTION\`(Meeting_Option_ID) ON DELETE CASCADE
        )
      `);
      console.log("✅ 'MEETING_VOTE' table ready.");
    } catch (schedTablesErr) {
      console.error("❌ Failed to create Group Scheduling tables:", schedTablesErr.message);
    }

    // 6e. Create NOTIFICATION table
    try {
      console.log("➡️ Creating 'NOTIFICATION' table...");
      await runQuery(db, `
        CREATE TABLE IF NOT EXISTS \`NOTIFICATION\` (
          Notification_ID VARCHAR(255) PRIMARY KEY,
          User_ID VARCHAR(255) NOT NULL,
          Type VARCHAR(50) NOT NULL,
          Title VARCHAR(255) NOT NULL,
          Content TEXT NOT NULL,
          Link VARCHAR(255) NULL,
          Is_Read TINYINT DEFAULT 0,
          Created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (User_ID) REFERENCES \`USER\`(User_ID) ON DELETE CASCADE
        )
      `);
      console.log("✅ 'NOTIFICATION' table ready.");
    } catch (notifTableErr) {
      console.error("❌ Failed to create NOTIFICATION table:", notifTableErr.message);
    }

    // 7. Insert a dedicated/hardcoded Admin account if it does not exist
    const adminEmail = "admin@lifesync.com";
    const adminPassword = "Admin@123456";
    const hashedPw = crypto.createHash("sha256").update(adminPassword).digest("hex");

    const existingAdmin = await runQuery(db, "SELECT User_ID FROM `USER` WHERE Email = ?", [adminEmail]);
    if (existingAdmin.length === 0) {
      console.log(`➡️ Creating default hardcoded Admin account (${adminEmail})...`);
      const adminId = crypto.randomUUID();
      const sqlInsertAdmin = `
        INSERT INTO \`USER\` (
          User_ID, Email, Password, FName, LName, Role, Email_Verified, Subscription_Status
        ) VALUES (?, ?, ?, 'System', 'Admin', 'admin', 1, 'premium')
      `;
      await runQuery(db, sqlInsertAdmin, [adminId, adminEmail, hashedPw]);
      console.log(`✅ Default admin created successfully! Pass: ${adminPassword}`);
    } else {
      console.log(`ℹ️ Hardcoded admin account (${adminEmail}) already exists.`);
      // Đảm bảo role luôn là admin
      await runQuery(db, "UPDATE `USER` SET `Role` = 'admin' WHERE Email = ?", [adminEmail]);
    }

    console.log("🎉 Database migrations completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

migrate();
