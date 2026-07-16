import json
import os
import subprocess

# Read original
old_content = subprocess.check_output(['git', 'show', '9751620:src/app/(admin)/reports.tsx']).decode('utf-8')

# The generatePDF block to inject
jspdf_import = "import { jsPDF } from 'jspdf';\nimport autoTable from 'jspdf-autotable';"

generate_pdf_code = """
  const generatePDF = async () => {
    try {
      if (filteredOrders.length === 0) {
        Alert.alert('Aviso', 'No hay datos para exportar.');
        return;
      }

      const doc = new jsPDF();
      let yPos = 20;

      // Title
      doc.setFontSize(22);
      doc.setTextColor(71, 49, 31);
      doc.text('Boho Sunday - Reporte Detallado', 14, yPos);
      yPos += 10;
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text(`Fecha de emisión: ${new Date().toLocaleDateString()}`, 14, yPos);
      yPos += 15;

      // SECTION 1: Resumen General
      doc.setFontSize(16);
      doc.setTextColor(71, 49, 31);
      doc.text('Resumen General', 14, yPos);
      yPos += 5;
      
      const summaryBody = [];
      if (showRevenue) summaryBody.push(['Ingresos Totales', `$${totalRevenue.toLocaleString()}`]);
      summaryBody.push(['Aforo (Ingresaron / Vendidos)', `${totalArrived} / ${totalCapacity}`]);
      summaryBody.push(['Porcentaje de Asistencia', `${Math.round(overallPercentage)}%`]);

      autoTable(doc, {
        startY: yPos,
        head: [['Métrica', 'Valor']],
        body: summaryBody,
        theme: 'grid',
        headStyles: { fillColor: [217, 209, 192], textColor: [71, 49, 31] },
      });
      yPos = doc.lastAutoTable.finalY + 15;

      // SECTION 2: Desglose por Etapas (Tiers)
      doc.setFontSize(16);
      doc.text('Desglose por Etapas', 14, yPos);
      yPos += 5;

      const tiersHead = showRevenue ? ['Etapa', 'Vendidos', 'Ingresaron', 'Asistencia', 'Ingresos'] : ['Etapa', 'Vendidos', 'Ingresaron', 'Asistencia'];
      const tiersBody = salesByTier.map(t => {
        const row = [t.name, t.sold.toString(), t.entered.toString(), `${Math.round(t.enteredPercentage)}%`];
        if (showRevenue) row.push(`$${t.revenue.toLocaleString()}`);
        return row;
      });

      autoTable(doc, {
        startY: yPos,
        head: [tiersHead],
        body: tiersBody,
        theme: 'striped',
        headStyles: { fillColor: [217, 209, 192], textColor: [71, 49, 31] },
      });
      yPos = doc.lastAutoTable.finalY + 15;

      // SECTION 3: Estado de Mesas (Wait, tables is not in the baseline store! Let's just list the general tickets for attendees instead of tables, as the PDF generation was failing on that before anyway!)
      
      // Actually, wait, let's keep it simple and just do what the original HTML PDF did, but in jsPDF!
      
      // SECTION 4: Listado de Asistentes
      doc.setFontSize(16);
      doc.text('Listado de Asistentes (Ingresos Registrados)', 14, yPos);
      yPos += 5;
      doc.setFontSize(12);
      doc.text('Últimos Asistentes Registrados (Max 50)', 14, yPos);
      yPos += 5;

      const attendeeLogs = filteredOrders
        .filter(o => o.accessesUsed > 0)
        .slice(0, 50)
        .map(o => [
          o.buyerInfo?.name || 'Desconocido',
          o.ticketName || 'General',
          o.quantity.toString(),
          o.accessesUsed.toString()
        ]);
        
      if (attendeeLogs.length > 0) {
        autoTable(doc, {
          startY: yPos,
          head: [['Nombre', 'Tipo', 'Cantidad Compra', 'Ingresaron']],
          body: attendeeLogs,
          theme: 'grid',
          headStyles: { fillColor: [217, 209, 192], textColor: [71, 49, 31] },
        });
      } else {
        doc.setFontSize(12);
        doc.text('No hay ingresos registrados aún.', 14, yPos);
      }

      // SAVE/EXPORT LOGIC
      if (Platform.OS === 'web') {
        doc.save('Boho_Sunday_Reporte.pdf');
        return;
      } else {
        const base64 = doc.output('datauristring').split(',')[1];
        const dir = FileSystem.documentDirectory || FileSystem.cacheDirectory;
        if (!dir) return;
        const fileUri = dir + 'Boho_Sunday_Reporte.pdf';
        
        await FileSystem.writeAsStringAsync(fileUri, base64, { encoding: FileSystem.EncodingType.Base64 });
        
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(fileUri, { UTI: 'com.adobe.pdf', dialogTitle: 'Compartir Reporte PDF' });
        }
      }
    } catch (e: any) {
      console.log(e);
      Alert.alert('Error', 'No se pudo generar el PDF.');
    }
  };
"""

# Replace the HTML generatePDF block
import re

# 1. Add imports
old_content = old_content.replace("import { useDatabaseStore } from '../../store/useDatabaseStore';", "import { useDatabaseStore } from '../../store/useDatabaseStore';\nimport { jsPDF } from 'jspdf';\nimport autoTable from 'jspdf-autotable';")

# 2. Replace generatePDF
# We find where const generatePDF = async () => { starts and where it ends
start_idx = old_content.find("const generatePDF = async () => {")
end_idx = old_content.find("  // --- RENDER HELPERS ---")

new_content = old_content[:start_idx] + generate_pdf_code + "\n" + old_content[end_idx:]

with open('src/app/(admin)/reports.tsx', 'w') as f:
    f.write(new_content)

print("Injected jsPDF cleanly!")
