// DSO Email Generator - Webhook
// Ontvangt requests van de Node.js scraper en de frontend web app

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // 1. Batch Sync vanuit Power BI 
    if (payload.type === 'Monitor Sync Batch') {
      const monitorSheet = ss.getSheetByName('Monitor Data');
      
      // Maak de sheet leeg om duplicaten en oude 'akn' ID's te voorkomen
      monitorSheet.clearContents();
      
      const headers = [
        'Gemeente', 'KPI1_Mest', 'KPI2_Regelanalist', 'KPI3_OLO', 'KPI4_Omgevingsplan',
        'Regeling Type', 'Behandeldienst', 'Aantal Regels', 'Laatste Wijziging', 'TR Software', 'Laatste Update'
      ];
      
      const rows = payload.data.map(r => [
        r.gemeente, 
        r.kpi1, 
        r.kpi2, 
        r.kpi3, 
        r.kpi4, 
        r.regelingType, 
        r.behandeldienst, 
        r.aantalRegels, 
        r.laatsteWijziging, 
        r.trSoftware, 
        new Date().toISOString()
      ]);
      
      monitorSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      monitorSheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
      
      if (rows.length > 0) {
        monitorSheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
      }

      // Schrijf ook een momentopname (historie) 
      const historySheet = ss.getSheetByName('Monitor History');
      if (historySheet) {
          const historyRows = payload.data.map(r => [
            r.gemeente, r.kpi1, r.kpi2, r.kpi3, r.kpi4, new Date().toISOString()
          ]);
          if (historyRows.length > 0) {
            historySheet.getRange(historySheet.getLastRow() + 1, 1, historyRows.length, 6).setValues(historyRows);
          }
      }

      return ContentService.createTextOutput(JSON.stringify({ 
        status: 'success', 
        message: 'Batch updated: ' + rows.length + ' rows' 
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 2. Notities en Email logs via de Web App
    if (payload.type === 'Mail verstuurd' || payload.type === 'Notitie' || !!payload.notitie) {
      const notesSheet = ss.getSheetByName('Gemeente Notities');
      
      if (notesSheet) {
          // Gemeente | Datum | Type | Notitie | Status | Fase | Auteur | Email Log
          if (payload.type === 'Mail verstuurd') {
             notesSheet.appendRow([payload.gemeente, payload.datum, payload.type, "", "", "", payload.auteur, payload.notitie]);
          } else {
             notesSheet.appendRow([payload.gemeente, payload.datum, payload.type || 'Notitie', payload.notitie, "", "", payload.auteur || 'System', ""]);
          }
      }
      
      return ContentService.createTextOutput(JSON.stringify({ status: 'success' })).setMimeType(ContentService.MimeType.JSON);
    }

    // Onbekend type
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Unknown payload type: ' + payload.type })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Nodig voor applicaties die pre-flight checken via GET
function doGet(e) {
  return ContentService.createTextOutput("DSO Email Generator Webhook is actief. (DoPost mode)");
}
