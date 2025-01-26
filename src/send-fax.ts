import PDFDocument from 'pdfkit';
import fs from 'fs';
import axios from 'axios';
import { OrderSummary } from './send-confirmation.js';
import { ShopConfig } from '../shop-configs.js';

export async function sendFaxConfirmation(
  order: OrderSummary,
  shopConfig: ShopConfig
) {
  const { CLICKSEND_USERNAME, CLICKSEND_API_KEY } = process.env;

  if (!CLICKSEND_USERNAME || !CLICKSEND_API_KEY) {
    throw new Error('ClickSend credentials are missing.');
  }

  // 1. Convert relevant fields into a simple text structure
  const orderDetailsText = `
  お客様が注文をしました
  =============================================

  ご注文番号: ${order.orderNum}
  注文日時: ${order.placed_at}
  引き取り日時: ${order.date}
  商品: ${order.itemType.split('-')[0]}
  目的: ${order.purpose.split('-')[0]}
  ご予算: ${order.budget}
  ご希望の色: ${order.color.split('-')[0]}
  電話番号: ${order.phoneNumber}

  =============================================
  ご不明な点がございましたら、お気軽にご連絡ください。
  `;

  // 2. Use pdfkit to generate a PDF from the above text
  const generatePdf = (text: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument();
      const pdfPath = './temp-fax.pdf';

      const writeStream = fs.createWriteStream(pdfPath);
      doc.pipe(writeStream);

      doc.fontSize(12).text(text);

      doc.end();

      writeStream.on('finish', () => resolve(pdfPath));
      writeStream.on('error', (err) => reject(err));
    });
  };

  // 3. Upload the generated PDF to ClickSend
  const uploadPdfToClickSend = async (pdfPath: string): Promise<string> => {
    const fileData = fs.createReadStream(pdfPath);
    const url = 'https://rest.clicksend.com/v3/uploads?convert=fax';

    const authHeader = `Basic ${Buffer.from(
      `${CLICKSEND_USERNAME}:${CLICKSEND_API_KEY}`
    ).toString('base64')}`;

    const response = await axios.post(
      url,
      { file: fileData },
      {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: authHeader,
        },
      }
    );

    return response.data.data._url;
  };

  // 4. Send fax via ClickSend using the uploaded file URL
  const sendFax = async (fileUrl: string): Promise<void> => {
    const url = 'https://rest.clicksend.com/v3/fax/send';

    const authHeader = `Basic ${Buffer.from(
      `${CLICKSEND_USERNAME}:${CLICKSEND_API_KEY}`
    ).toString('base64')}`;

    const payload = {
      file_url: fileUrl,
      source: 'typescript',
      from: '+61261111111',
      to: '+61411111111',
      // to: shopConfig.recipientFax ?? '+61411111111', // Replace with the recipient fax number
      // from: shopConfig.senderFax ?? '+61411111111', // Replace with your sender fax number
      custom_string: order.orderNum, // Reference for tracking
    };

    const response = await axios.post(url, payload, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
    });

    if (response.status !== 200) {
      throw new Error(`Failed to send fax: ${response.statusText}`);
    }
  };

  try {
    // Generate PDF
    const pdfPath = await generatePdf(orderDetailsText);

    // Upload PDF
    const fileUrl = await uploadPdfToClickSend(pdfPath);

    // Send fax
    await sendFax(fileUrl);

    console.log('Fax sent successfully!');
  } catch (error) {
    console.error('Error sending fax:', error);
    throw error;
  } finally {
    // Remove the temporary PDF file
    if (fs.existsSync('./temp-fax.pdf')) {
      fs.unlinkSync('./temp-fax.pdf');
    }
  }
}
