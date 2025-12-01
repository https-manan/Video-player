import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from "path";
import { exec } from 'child_process';
import fs from 'fs';

const port = 8080;
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static('uploads'));
app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}));

// ❗ Removed your conflicting wildcard CORS header because it breaks credentials mode
// app.use((req, res, next) => {
//   res.header("Access-Control-Allow-Origin", "*");
//   next();
// });

// multer middleware
const storage = multer.diskStorage({
  destination(req, file, cb) { //cb is callback
    cb(null, "./uploads");
  },
  filename(req, file, cb){
    cb(null, file.fieldname + "-" + uuidv4() + path.extname(file.originalname));
  }
});

// multer configuration
const upload = multer({ storage });


// app.get('/', (req, res) => {
//   res.send("Server is running");
// });

                    // this means a single file.
app.post('/upload', upload.single('file'), function (req, res) {

    if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
    }

    const lessonId  = uuidv4()
    const videoPath  = req.file.path //We need this coz we have to give this to ffmpeg library 
    const outputPath = `./uploads/courses/${lessonId}`;
    const hlsPath = `${outputPath}/index.m3u8` //HLS is unstiched video and m3u8 is indexes of files like chunnks of file ka guide

    if (!fs.existsSync(outputPath)) {
        fs.mkdirSync(outputPath, { recursive: true })
    }

    // ❗ Windows-safe ffmpeg command (NO line continuation "\" — Windows does not support it)
    const ffmpegCommand = `ffmpeg -i "${videoPath}" -codec:v libx264 -codec:a aac -hls_time 10 -hls_playlist_type vod -hls_segment_filename "${outputPath}/segment%03d.ts" "${hlsPath}"`;

    // Actually run the command
    exec(ffmpegCommand, (error, stdout, stderr) => {

        console.log("FFmpeg stdout:", stdout);
        console.log("FFmpeg stderr:", stderr);

        if (error) {
            console.error("FFmpeg Error:", error);
            return res.status(500).json({ error: "Video conversion failed", details: stderr });
        }

        // Finished creating segments
        const videoUrl = `http://localhost:8080/uploads/courses/${lessonId}/index.m3u8`;

        res.json({
            message: 'video converted to HLS format',
            videoURL: videoUrl,
        });
    });
});


app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
