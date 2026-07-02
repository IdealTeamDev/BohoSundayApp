import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { useDatabaseStore } from '../../store/useDatabaseStore';
import { useAuthStore } from '../../store/useAuthStore';
import { FileText, Download, DollarSign, Users, Activity, Coffee } from 'lucide-react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { Ticket } from '../../types';

export default function ReportsScreen() {
  const { tiers, tickets, tables } = useDatabaseStore();
  const { user } = useAuthStore();
  const showRevenue = user?.role !== 'viewer2';

  const ticketsArr = Object.values(tickets || {}) as Ticket[];
  
  // --- METRICS CALCULATION ---
  const totalCapacity = ticketsArr.reduce((acc, t) => acc + t.capacity, 0);
  const totalArrived = ticketsArr.reduce((acc, t) => acc + t.used, 0);
  const overallPercentage = totalCapacity > 0 ? (totalArrived / totalCapacity) * 100 : 0;

  const salesByTier = tiers.map(tier => {
    const tix = ticketsArr.filter(t => t.tierId === tier.id);
    const sold = tix.reduce((acc, t) => acc + t.capacity, 0);
    const entered = tix.reduce((acc, t) => acc + t.used, 0);
    const revenue = sold * tier.price;
    const soldPercentage = tier.capacity > 0 ? (sold / tier.capacity) * 100 : 0;
    const enteredPercentage = sold > 0 ? (entered / sold) * 100 : 0;
    return { tier, sold, entered, revenue, soldPercentage, enteredPercentage };
  });

  const totalRevenue = salesByTier.reduce((acc, t) => acc + t.revenue, 0);
  
  const totalTables = tables.length;
  const occupiedTables = tables.filter(t => t.status !== 'available').length;
  const tableOccupancy = totalTables > 0 ? (occupiedTables / totalTables) * 100 : 0;

  // --- EXPORT FUNCTIONS ---
  const generateCSV = async () => {
    try {
      if (ticketsArr.length === 0) {
        Alert.alert('Aviso', 'No hay datos de tickets para exportar.');
        return;
      }
      const header = "ID,Nombre,Codigo_QR,Etapa_ID,Mesa_ID,Comprados,Ingresados,Estado\n";
      const rows = ticketsArr.map(t => 
        `${t.id},"${t.buyerName}",${t.qrCode},${t.tierId || ''},${t.tableId || ''},${t.capacity},${t.used},${t.status}`
      ).join('\n');
      
      const csv = header + rows;
      
      if (Platform.OS === 'web') {
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "Boho_Reporte_Ventas.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }
      
      // @ts-ignore
      const dir = FileSystem.documentDirectory || FileSystem.cacheDirectory;
      if (!dir) {
         Alert.alert('Error', 'No hay acceso al almacenamiento del dispositivo.');
         return;
      }
      // @ts-ignore
      const fileUri = dir + 'Boho_Reporte_Ventas.csv';
      
      await FileSystem.writeAsStringAsync(fileUri, csv, { encoding: FileSystem.EncodingType.UTF8 });
      
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(fileUri, { UTI: 'public.comma-separated-values-text', dialogTitle: 'Compartir Excel' });
      } else {
        Alert.alert('Error', 'La función de compartir no está disponible en este dispositivo.');
      }
    } catch (e: any) {
      console.log(e);
      Alert.alert('Error', 'No se pudo generar el CSV: ' + String(e.message || e));
    }
  };

  const generatePDF = async () => {
    try {
      if (ticketsArr.length === 0) {
        Alert.alert('Aviso', 'No hay datos para exportar.');
        return;
      }
      const htmlContent = `
        <html>
          <head>
            <style>
              body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #231e1a; background-color: #f4efe9; }
              h1 { color: #47311f; font-size: 32px; border-bottom: 2px solid #686a54; padding-bottom: 10px; }
              .grid { display: flex; gap: 20px; flex-wrap: wrap; margin-top: 20px; }
              .card { flex: 1; min-width: 200px; background-color: #d9d1c0; padding: 20px; border-radius: 12px; }
              .card-title { font-size: 14px; color: #686a54; text-transform: uppercase; margin-bottom: 5px; }
              .stat { font-size: 28px; font-weight: bold; color: #47311f; margin: 0; }
              .bar-track { background-color: #bdb39b; border-radius: 8px; height: 12px; width: 100%; margin-top: 8px; overflow: hidden; }
              .bar-fill { background-color: #686a54; height: 100%; border-radius: 8px; }
              table { width: 100%; border-collapse: collapse; margin-top: 30px; }
              th, td { text-align: left; padding: 12px; border-bottom: 1px solid #bdb39b; }
              th { background-color: #d9d1c0; color: #47311f; font-weight: 600; }
            </style>
          </head>
          <body>
            <h1>Boho Sunday - Reporte Detallado</h1>
            <p>Fecha de emisión: ${new Date().toLocaleDateString()}</p>
            
            <div class="grid">
              ${showRevenue ? `
              <div class="card">
                <div class="card-title">Ingresos Totales</div>
                <p class="stat">$${totalRevenue}</p>
              </div>
              ` : ''}
              <div class="card">
                <div class="card-title">Aforo (Ingresaron / Vendidos)</div>
                <p class="stat">${totalArrived} / ${totalCapacity}</p>
                <div class="bar-track"><div class="bar-fill" style="width: ${Math.min(overallPercentage, 100)}%;"></div></div>
              </div>
              <div class="card">
                <div class="card-title">Ocupación de Mesas</div>
                <p class="stat">${occupiedTables} / ${totalTables}</p>
                <div class="bar-track"><div class="bar-fill" style="width: ${Math.min(tableOccupancy, 100)}%;"></div></div>
              </div>
            </div>

            <h2 style="margin-top: 40px; color: #47311f;">Desglose por Etapas (Tiers)</h2>
            ${salesByTier.map(data => `
              <div style="margin-bottom: 25px; padding: 15px; border-left: 4px solid #686a54; background: #fff;">
                <h3 style="margin: 0 0 10px 0; color: #47311f;">${data.tier.name}</h3>
                ${showRevenue ? `<p style="margin:0; font-size: 14px; color: #231e1a;"><strong>Ingresos:</strong> $${data.revenue}</p>` : ''}
                
                <p style="margin: 15px 0 5px 0; font-size: 12px; color: #686a54;">Ventas: ${data.sold} de ${data.tier.capacity} (${Math.round(data.soldPercentage)}%)</p>
                <div class="bar-track"><div class="bar-fill" style="width: ${Math.min(data.soldPercentage, 100)}%;"></div></div>
                
                <p style="margin: 15px 0 5px 0; font-size: 12px; color: #686a54;">Asistencia Real: ${data.entered} de ${data.sold} tickets vendidos (${Math.round(data.enteredPercentage)}%)</p>
                <div class="bar-track"><div class="bar-fill" style="width: ${Math.min(data.enteredPercentage, 100)}%; background-color: #47311f;"></div></div>
              </div>
            `).join('')}

            <h2 style="margin-top: 40px; color: #47311f;">Últimos Escaneos Registrados</h2>
            <table>
              <tr>
                <th>Nombre</th>
                <th>Código QR</th>
                <th>Comprados</th>
                <th>Ingresaron</th>
                <th>Estado</th>
              </tr>
              ${ticketsArr.filter(t => t.used > 0).slice(0, 20).map(t => `
                <tr>
                  <td>${t.buyerName}</td>
                  <td>${t.qrCode}</td>
                  <td>${t.capacity}</td>
                  <td>${t.used}</td>
                  <td>${t.status.toUpperCase()}</td>
                </tr>
              `).join('')}
            </table>
            <p style="text-align: center; margin-top: 50px; color: #686a54; font-size: 12px;">Generado automáticamente por Boho Sunday Staff App</p>
          </body>
        </html>
      `;

      if (Platform.OS === 'web') {
        await Print.printAsync({ html: htmlContent });
        return;
      }

      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, { UTI: 'com.adobe.pdf', dialogTitle: 'Compartir PDF' });
      } else {
        Alert.alert('Error', 'La función de compartir no está disponible.');
      }
    } catch (e: any) {
      console.log(e);
      Alert.alert('Error', 'No se pudo generar el PDF: ' + String(e.message || e));
    }
  };

  // --- RENDER HELPERS ---
  const renderProgressBar = (percentage: number, color = '#686a54') => (
    <View style={styles.progressBarTrack}>
      <View style={[styles.progressBarFill, { width: `${Math.min(percentage, 100)}%`, backgroundColor: color }]} />
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      
      <Text style={styles.headerTitle}>Dashboard de Métricas</Text>
      
      {/* KPI CARDS ROW 1 */}
      <View style={styles.kpiRow}>
        {showRevenue && (
          <View style={styles.kpiCard}>
            <View style={styles.kpiHeader}>
              <Text style={styles.kpiTitle}>Ingresos Totales</Text>
              <DollarSign color="#686a54" size={16} />
            </View>
            <Text style={styles.kpiValue}>${totalRevenue}</Text>
          </View>
        )}
        <View style={styles.kpiCard}>
          <View style={styles.kpiHeader}>
            <Text style={styles.kpiTitle}>Tickets Vendidos</Text>
            <Activity color="#686a54" size={16} />
          </View>
          <Text style={styles.kpiValue}>{totalCapacity}</Text>
        </View>
      </View>

      {/* KPI CARDS ROW 2 */}
      <View style={styles.kpiRow}>
        <View style={styles.kpiCard}>
          <View style={styles.kpiHeader}>
            <Text style={styles.kpiTitle}>Aforo Actual</Text>
            <Users color="#686a54" size={16} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
            <Text style={styles.kpiValue}>{totalArrived}</Text>
            <Text style={styles.kpiSub}> / {totalCapacity}</Text>
          </View>
          {renderProgressBar(overallPercentage)}
        </View>
        
        <View style={styles.kpiCard}>
          <View style={styles.kpiHeader}>
            <Text style={styles.kpiTitle}>Ocupación Mesas</Text>
            <Coffee color="#686a54" size={16} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
            <Text style={styles.kpiValue}>{occupiedTables}</Text>
            <Text style={styles.kpiSub}> / {totalTables}</Text>
          </View>
          {renderProgressBar(tableOccupancy, '#47311f')}
        </View>
      </View>

      <Text style={styles.sectionTitle}>Desglose Financiero por Etapa</Text>
      
      <View style={styles.listContainer}>
        {salesByTier.length > 0 ? salesByTier.map((data, idx) => (
          <View key={data.tier.id} style={[styles.tierRow, idx === salesByTier.length - 1 && { borderBottomWidth: 0 }]}>
            <View style={styles.tierHeader}>
              <Text style={styles.tierName}>{data.tier.name}</Text>
              {showRevenue && <Text style={styles.tierRevenue}>${data.revenue}</Text>}
            </View>
            
            <View style={styles.progressSection}>
              <View style={styles.progressLabelRow}>
                <Text style={styles.progressLabel}>Ventas</Text>
                <Text style={styles.progressValue}>{data.sold} / {data.tier.capacity} ({Math.round(data.soldPercentage)}%)</Text>
              </View>
              {renderProgressBar(data.soldPercentage, '#686a54')}
            </View>

            <View style={styles.progressSection}>
              <View style={styles.progressLabelRow}>
                <Text style={styles.progressLabel}>Asistencia Real</Text>
                <Text style={styles.progressValue}>{data.entered} / {data.sold} ({Math.round(data.enteredPercentage)}%)</Text>
              </View>
              {renderProgressBar(data.enteredPercentage, '#47311f')}
            </View>
          </View>
        )) : (
          <Text style={styles.emptyText}>No hay etapas creadas aún.</Text>
        )}
      </View>

      <Text style={styles.sectionTitle}>Exportación de Datos</Text>
      
      <View style={styles.actionRow}>
        <TouchableOpacity style={[styles.exportBtn, { backgroundColor: '#686a54' }]} onPress={generateCSV}>
          <FileText color="#f4efe9" size={24} />
          <Text style={styles.exportBtnText}>Descargar CSV</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.exportBtn, { backgroundColor: '#47311f' }]} onPress={generatePDF}>
          <Download color="#f4efe9" size={24} />
          <Text style={styles.exportBtnText}>Generar Reporte PDF</Text>
        </TouchableOpacity>
      </View>
      
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4efe9',
    padding: 16,
  },
  headerTitle: {
    color: '#231e1a',
    fontSize: 22,
    fontFamily: 'NunitoSans_700Bold',
    marginBottom: 20,
  },
  sectionTitle: {
    color: '#231e1a',
    fontSize: 18,
    fontFamily: 'NunitoSans_600SemiBold',
    marginTop: 10,
    marginBottom: 16,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#d9d1c0',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#bdb39b',
  },
  kpiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  kpiTitle: {
    color: '#686a54',
    fontSize: 12,
    fontFamily: 'NunitoSans_600SemiBold',
    textTransform: 'uppercase',
  },
  kpiValue: {
    color: '#47311f',
    fontSize: 28,
    fontFamily: 'NunitoSans_700Bold',
  },
  kpiSub: {
    color: '#686a54',
    fontSize: 14,
    fontFamily: 'NunitoSans_400Regular',
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: '#bdb39b',
    borderRadius: 3,
    marginTop: 10,
    width: '100%',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  listContainer: {
    backgroundColor: '#d9d1c0',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#bdb39b',
    marginBottom: 24,
    overflow: 'hidden',
  },
  tierRow: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#bdb39b',
  },
  tierHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tierName: {
    color: '#231e1a',
    fontSize: 16,
    fontFamily: 'NunitoSans_700Bold',
  },
  tierRevenue: {
    color: '#47311f',
    fontSize: 16,
    fontFamily: 'NunitoSans_700Bold',
  },
  progressSection: {
    marginBottom: 8,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  progressLabel: {
    color: '#686a54',
    fontSize: 12,
    fontFamily: 'NunitoSans_600SemiBold',
  },
  progressValue: {
    color: '#47311f',
    fontSize: 12,
    fontFamily: 'NunitoSans_400Regular',
  },
  emptyText: {
    color: '#686a54',
    fontSize: 14,
    padding: 20,
    textAlign: 'center',
  },
  actionRow: {
    flexDirection: 'column',
    gap: 12,
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 16,
  },
  exportBtnText: {
    color: '#f4efe9',
    fontSize: 16,
    fontFamily: 'NunitoSans_600SemiBold',
    marginLeft: 12,
  }
});
