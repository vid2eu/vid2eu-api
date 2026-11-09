const fs = require('fs');
const mime = require('mime-types');
const { execSync } = require('child_process');

const parseMetadata = (filePath) => {
    const stats = fs.statSync(filePath);
    return {
        fileName: filePath.split('/').pop(),
        size: stats.size,
        mimeType: mime.lookup(filePath) || 'application/octet-stream',
        resolution: getResolution(filePath)
    };
};

const getResolution = (filePath) => {
    try {
        const output = execSync(`ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 "${filePath}"`).toString().trim();
        return output;
    } catch (error) {
        return null;
    }
};

(() => {
    const videoPath = './video.mp4';
    const metadata = parseMetadata(videoPath);
    console.log(metadata);
})();