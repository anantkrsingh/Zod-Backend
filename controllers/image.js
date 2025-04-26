const { Storage } = require("@google-cloud/storage");
const path = require("path");
const fs = require("fs");
const os = require("os");
const { exec } = require("child_process");
const util = require("util");
const execPromise = util.promisify(exec);
const sharp = require("sharp");
const axios = require("axios");
const storage = new Storage({
  projectId: process.env.GCP_PROJECT_ID,
  keyFilename: process.env.GCP_KEY_FILE_PATH,
});

const generateImage = async ({ prompt }) => {
  let outputFile = null;
  try {
    if (!prompt) {
      throw new Error("Prompt is required");
    }

    const randomNumber = Math.floor(Math.random() * 6);

    return images[randomNumber];

    const escapedPrompt = prompt.replace(/"/g, '\\"');

    const { stdout } = await execPromise(
      `python3 ${path.join(
        __dirname,
        "../scripts/generate_image.py"
      )} "${escapedPrompt}"`
    );

    outputFile = stdout.trim();

    const result = JSON.parse(fs.readFileSync(outputFile, "utf8"));

    if (!result.success) {
      throw new Error("Failed to generate image");
    }

    const tempFilePath = path.join(
      os.tmpdir(),
      `generated-image-${Date.now()}.png`
    );
    fs.writeFileSync(tempFilePath, Buffer.from(result.image_data, "base64"));

    const bucketName = process.env.GCP_BUCKET_NAME;
    const fileName = `images/${prompt}-${Date.now()}-${Math.random()
      .toString(36)
      .substring(7)}.png`;

    await storage.bucket(bucketName).upload(tempFilePath, {
      destination: fileName,
      metadata: {
        contentType: "image/png",
      },
    });

    const [url] = await storage.bucket(bucketName).file(fileName).getSignedUrl({
      action: "read",
      expires: "03-01-2500",
    });

    fs.unlinkSync(tempFilePath);
    if (outputFile) {
      fs.unlinkSync(outputFile);
    }

    return url;
  } catch (error) {
    console.error("Error generating image:", error);
    if (outputFile && fs.existsSync(outputFile)) {
      fs.unlinkSync(outputFile);
    }
    throw new Error("Failed to generate image");
  }
};

const generateThumbnail = async ({
  imageUrl,
  avatarUrl,
  username = "anantkr",
}) => {
  const padding = 20;

  const imageBuffer = await axios
    .get(imageUrl, { responseType: "arraybuffer" })
    .then((res) => res.data);
  const avatarBuffer = await axios
    .get(avatarUrl, { responseType: "arraybuffer" })
    .then((res) => res.data);

  const imageMetadata = await sharp(imageBuffer).metadata();
  const { width, height } = imageMetadata;

  // Frame dimensions with padding
  const frameWidth = width + padding * 2;
  const frameHeight = height + padding * 2;

  const blurredBg = await sharp(imageBuffer)
    .resize(frameWidth, frameHeight)
    .blur(30)
    .toBuffer();

  const roundedImage = await sharp(imageBuffer)
    .composite([
      {
        input: Buffer.from(
          `<svg><rect x="0" y="0" width="${width}" height="${height}" rx="24" ry="24"/></svg>`
        ),
        blend: "dest-in",
      },
    ])
    .toBuffer();

  const finalImageBuffer = await sharp(blurredBg)
    .composite([
      { input: roundedImage, top: padding, left: padding },
      {
        input: await sharp(avatarBuffer)
          .resize(48, 48)
          .composite([
            {
              input: Buffer.from(`<svg><circle cx="24" cy="24" r="24"/></svg>`),
              blend: "dest-in",
            },
          ])
          .toBuffer(),
        top: padding,
        left: frameWidth - 48 - padding,
      },
    ])
    .extend({
      top: 4,
      bottom: 4,
      left: 4,
      right: 4,
      background: { r: 255, g: 255, b: 255, alpha: 0 },
    })
    .png()
    .toBuffer();

  const filename = `framed-${Date.now()}.png`;
  const bucketName = process.env.GCP_BUCKET_NAME;
  const filePath = `thumbnails/${filename}`;
  const tempFilePath = path.join(os.tmpdir(), filename);
  fs.writeFileSync(tempFilePath, finalImageBuffer);

  try {
    await storage.bucket(bucketName).upload(tempFilePath, {
      destination: filePath,
      metadata: { contentType: "image/png" },
    });

    const [url] = await storage.bucket(bucketName).file(filePath).getSignedUrl({
      action: "read",
      expires: "03-01-2500",
    });

    fs.unlinkSync(tempFilePath);
    return url;
  } catch (error) {
    if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
    throw error;
  }
};

const images = [
  "https://storage.googleapis.com/zod-bucket/images/1744892833008-2gbuu.png?GoogleAccessId=vertex%40etm-cloud.iam.gserviceaccount.com&Expires=16730303400&Signature=DPRHDOOaA6jTvPuxCPvXA6QTM56UenHjmVxH1wOIDN5JSqaYB%2Fo1BdR289x64y9hYKF4BGR6dddFijQuEiM%2F4alnMBv8mG6W6RKY48rQnHsx1H9jA4moSuNIlegLPTS%2Bk4LZB0Rs%2FM9HNgvp9yB%2F%2FDFVJD%2F3EPxzhjIpSQooZufwtm25tByZMJL316FeUtz922t0SMyy5EzcBuUfeKvbm%2FiBIY9tz2hhG8p61u%2Fboo3IKqcHE0Dm%2FEoRJwUZ2MzcI5ztYNy7peHVNTHthI6pgQnkRRic7orDjzwKym7YdZbn58fWK3Gxl2EikO%2B1N316hHPjCUpwuOO7fgDGH8%2Bpiw%3D%3D",
  "https://storage.googleapis.com/zod-bucket/images/1744945525516-dm19b9.png?GoogleAccessId=vertex%40etm-cloud.iam.gserviceaccount.com&Expires=16730303400&Signature=jr5A93JTknLG4532Y4aymsyd3QZKiZRRcmjePSufWZOUiSwDhWBuZkyVLuCGBphGNUep%2Fx33dL%2Bo5nxgaWdlfH5O3SGWzY%2Bt5dgJyGh5WharV62CW37rS78GM9Us8wbvXSg%2BKchiNbeW292DHU0fEcae1v9%2FXMEhdJhBBtFUvbVTtuQPDqrjbN0KMME%2BcYxYMFJP%2Bj4DXh5qaOpLB0n0Oh9fT81DBDagNs2lNPyCs451loAPuxkAjRRpfe5Q9H5JIBZegmdrgaXpCyJmRZHpe8VH1SA%2FrOHCZEndEHcYWekZaBaB6J37HscHylBbdjYqzd1je%2F5szQ9CKXyYPfvvgQ%3D%3D",
  "https://storage.googleapis.com/zod-bucket/images/1744945152816-7bdy7.png?GoogleAccessId=vertex%40etm-cloud.iam.gserviceaccount.com&Expires=16730303400&Signature=mZjImdnBArVV7VuHa9TsGepingfROvPPLLxHxVZgNFtn7ZwH54fbCLJkAdlXukGMGAZF%2FQParpdDue5lvsnwaeI3%2BRrhMBluht6LWkBstYtxLURJOLnq%2BSrEIBwUsHlgA004xAXBBK9uN5XiRY4xBIUnq3Ii8YjZzCIlv6%2FC2F8zK5H0l60GQNwlYLRQZcMFTg2uvYD12b%2BPXhuPqnmUi5DqnRHhRuR%2BDMolFSFoBTPlGlKF0x%2FKGT%2FCh08UlM4xVMZ%2BftHvLXoRi66jfoORFLnO7DdU1oOZO2gA%2BN0hkl2MYTq76u8UwIg3R3ub31ZD3gq2r9rI0iS%2FSmtWhg7oPg%3D%3D",
  "https://storage.googleapis.com/zod-bucket/images/1744945118628-4bcyd8.png?GoogleAccessId=vertex%40etm-cloud.iam.gserviceaccount.com&Expires=16730303400&Signature=WxDQc%2Fx0nV1bxPavaTSvJcBil5SCuTctv6G%2BhX1R%2FZX1u2yhwcJ3bzMPJN0aVWBQTraicoJw%2FLIfAmitSV80txhJ4TEDQWDMBvbfxXIJrZ3HBNq9XL2AxQ7n3rPepEnqK5ygxjQ%2B%2F5C8Bp%2Fe5XxEKjg2wsJw3OfPF5CWyl8WTYwS2Bx2i8kDgNpUVLgNXta682hrVaxEr%2BVLHdmX3LfA9WrJowHMWm4nYqffjkbyacTUANMeLLY8%2F%2FpAVuC3EyxpR6MrFdj5oUBx2eaEnSRx%2FP3fBpZxMTUDQsyQR23Aef0PBhr3mkeeZl%2FcALKTGyExWQ2N%2F6rY0%2Fld%2BEh2%2F7O3Fg%3D%3D",
  "https://storage.googleapis.com/zod-bucket/images/1744945070770-0ptl9.png?GoogleAccessId=vertex%40etm-cloud.iam.gserviceaccount.com&Expires=16730303400&Signature=aMr%2B4Uz4mg8KmOvsaGobqADYjnjNu0rCLSppJnrPjFJEscUzQsz9UTu7rr6%2BC%2BUYxTY1lipdfCLE2kDrofC0e0SfPQ7tAW1uf0TrL4d1biTJeb%2FyOTwOuc7f%2B8VRlgpMt%2BNd%2FHWAGppSQNGHPpb9jidE86ZnjWGw9FsIllKNT4sPWdlrDo24Y618ukgScZxYUJ6VUZAffzvKlp2qpa9sfDu2k5MZs2fnfe6kBwZjPmJxWaaYQZD5slPb9ez6XibdG%2FBVH12gf1o0ZiyIxgqJ3osHT6%2FxJp%2BNdh5NvR0lokzUFGwmDBnnRhxs84OPRBl5fkpXZR1amDPSS2QkZFSrMA%3D%3D",
  "https://storage.googleapis.com/zod-bucket/images/1744945026995-wmtksf.png?GoogleAccessId=vertex%40etm-cloud.iam.gserviceaccount.com&Expires=16730303400&Signature=YnoM20EEqDc7v52FPN5SEB%2FmDb6ejWvxOiXhQMMh0hOVEiu6G4qmzUhMke9ONGfvkxZgeV3GgkLLMHH%2BGKEO0VXbeNPqb5GgzonhIEgcqNsPBTnTvHWo%2FxMQLZvEmypQPakMcqscPd3lMIIMAjJvtlj%2FOpITBMe2jQQRWDheDEnRcZ7Bc%2BQHLbMJmh3b9ddrRa4%2FL1HsvtRML%2FvBhFDG2cjIVmCtdSmLW06K9gQq5V0ZfJWPp1Coh8tyfHnO2vQFaZ7mRzIwea8Q056Xd%2BOCMyaqp54E1AXoq0AV6K5ky5EB%2FOMJ12uWPudyq3qkCxx93NDy4B8%2Fa709BOMbojU%2BIA%3D%3D",
];

module.exports = {
  generateImage,
  generateThumbnail,
};
