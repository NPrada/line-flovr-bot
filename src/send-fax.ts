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

  ご氏名: ${order.customerName}
  引き取り日時: ${order.human_date}
  目的: ${order.purpose.split("-")[0]}
  商品: ${order.itemType.split("-")[0]}
  ご予算: ${order.budget}
  ご希望の色: ${order.color.split("-")[0]}
  ご注文番号: ${order.orderNum}
  注文日時: ${order.human_placed_at}
  電話番号: ${order.phoneNumber}

  =============================================
  ご不明な点がございましたら、お気軽にご連絡ください。
  `;

  const pdfName = `./temp-fax-${order.orderNum}.pdf`

  // 2. Use pdfkit to generate a PDF from the above text
  const generatePdf = (text: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument();
      const pdfPath = pdfName;

      const writeStream = fs.createWriteStream(pdfPath);
      doc.pipe(writeStream);
      console.log(orderDetailsText);

      doc.font("./Kosugi-Regular.ttf")
      doc.text(orderDetailsText);

      doc.end();

      writeStream.on("finish", () => resolve(pdfPath));
      writeStream.on("error", (err) => reject(err));
    });
  };

  // 3. Upload the generated PDF to ClickSend
  const uploadPdfToClickSend = async (pdfPath: string): Promise<string> => {
    const fileData = fs.createReadStream(pdfPath);
    const url = "https://rest.clicksend.com/v3/uploads?convert=fax";

    const authHeader = `Basic ${Buffer.from(
      `${CLICKSEND_USERNAME}:${CLICKSEND_API_KEY}`
    ).toString("base64")}`;

    const response = await axios.post(
      url,
      { file: fileData },
      {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: authHeader,
        },
      }
    );

    return response.data.data._url;
  };

  // 4. Send fax via ClickSend using the uploaded file URL
  const sendFax = async (fileUrl: string) => {
    const url = "https://rest.clicksend.com/v3/fax/send";

    const authHeader = `Basic ${Buffer.from(
      `${CLICKSEND_USERNAME}:${CLICKSEND_API_KEY}`
    ).toString("base64")}`;

    const payload = {
      file_url: fileUrl,
      messages: [
        {
          source: "typescript",
          from: "",
          to: shopConfig.faxNumber,
          custom_string: order.orderNum, // Reference for tracking
        },
      ],
    };

    const response = await axios.post(url, payload, {
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
    });

    if (response.status !== 200) {
      throw new Error(`Failed to send fax: ${response.statusText}`);
    }
    return response;
  };

  try {
    // Generate PDF
    const pdfPath = await generatePdf(orderDetailsText);

    // Upload PDF
    const fileUrl = await uploadPdfToClickSend(pdfPath);
    
    // Send fax
    if (process.env.NODE_ENV === "production") {
      const sendFaxRes = await sendFax(fileUrl);
      console.log("Fax sent successfully!", sendFaxRes);
    }

  } catch (error) {
    console.error("Error sending fax:", error);
    throw error;
  } finally {
    // Remove the temporary PDF file
    if (fs.existsSync(pdfName)) {
      fs.unlinkSync(pdfName);
    }
  }
}
