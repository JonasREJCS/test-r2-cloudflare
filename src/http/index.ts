import express, { Request } from 'express'
import { config } from 'dotenv';
import { randomUUID } from 'crypto';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { r2 } from '../lib/cloudflare'
import multer from 'multer';

config();

const app = express()
const port = 3000

console.log(process.env.R2_ACCESS_KEY_ID)

app.post('/uploads', async (request, response) => {
    const signedURL = await getSignedUrl(
        r2,
        new PutObjectCommand({
            Bucket: 'umatchimages',
            Key: 'teste.jpg',
            ContentType: 'image/jpeg',
        }),
        { expiresIn: 600 }
    );

    response.json({ signedURL });
})

const upload = multer({ storage: multer.memoryStorage() });

interface MulterRequest extends Request {
    file?: Express.Multer.File;
}

app.post('/upload-image', upload.single('image'), async (req: MulterRequest, res): Promise<void> => {
    if (!req.file) {
        res.status(400).send('No file uploaded.');
        return Promise.resolve();
    }

    const key = `${randomUUID()}.jpg`;

    try {
        await r2.send(new PutObjectCommand({
            Bucket: 'umatchimages',
            Key: key,
            Body: req.file.buffer,
            ContentType: req.file.mimetype,
        }));

        res.json({ message: 'File uploaded successfully', key });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error uploading file.');
    }
});

app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`)
})
