export default function handler(req, res) {
    // Redirect to the actual PDF file
    // This anonymizes the link in the email signature
    const pdfUrl = 'https://dso-email-generator.vercel.app/Whitepaper_AbelTalent.pdf';

    res.writeHead(302, { Location: pdfUrl });
    res.end();
}
