import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform, ActivityIndicator, RefreshControl } from 'react-native';
import { useAuthStore } from '../../store/useAuthStore';
import { FileText, Download, DollarSign, Users, Activity, Coffee } from 'lucide-react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { api, OrderInfo } from '../../services/api';

export default function ReportsScreen() {
  const { user } = useAuthStore();
  const showRevenue = true; 
  
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadOrders = useCallback(async () => {
    try {
      const data = await api.getAdminOrders();
      setOrders(data || []);
    } catch (err: any) {
      console.log('Error loading orders:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
    const interval = setInterval(loadOrders, 15000);
    return () => clearInterval(interval);
  }, [loadOrders]);

  const onRefresh = () => {
    setRefreshing(true);
    loadOrders();
  };

  // --- METRICS CALCULATION ---
  const totalCapacity = orders.reduce((acc, o) => acc + o.quantity, 0);
  const totalArrived = orders.reduce((acc, o) => acc + (o.accessesUsed || 0), 0);
  const overallPercentage = totalCapacity > 0 ? (totalArrived / totalCapacity) * 100 : 0;

  // Group by ticketName/zone
  const salesByTierMap = new Map();
  orders.forEach(o => {
    const key = o.ticketName || 'General';
    if (!salesByTierMap.has(key)) {
      salesByTierMap.set(key, { 
        name: key, 
        sold: 0, 
        entered: 0, 
        revenue: 0 
      });
    }
    const tier = salesByTierMap.get(key);
    tier.sold += o.quantity;
    tier.entered += (o.accessesUsed || 0);
    tier.revenue += (o.price || 0) * o.quantity;
  });

  const salesByTier = Array.from(salesByTierMap.values()).map(t => ({
    ...t,
    soldPercentage: 100, // We don't have total capacity per tier dynamically here easily, so 100% of sold
    enteredPercentage: t.sold > 0 ? (t.entered / t.sold) * 100 : 0
  }));

  const totalRevenue = salesByTier.reduce((acc, t) => acc + t.revenue, 0);

  // --- EXPORT FUNCTIONS ---
  const generateCSV = async () => {
    try {
      if (orders.length === 0) {
        Alert.alert('Aviso', 'No hay datos de tickets para exportar.');
        return;
      }
      const header = "Order_ID,Comprador,Ticket,Cantidad,Ingresados,Monto\n";
      const rows = orders.map(o => 
        `${o.orderId},"${o.buyerInfo?.name}",${o.ticketName},${o.quantity},${o.accessesUsed || 0},${(o.price || 0) * o.quantity}`
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
      if (!dir) return;
      // @ts-ignore
      const fileUri = dir + 'Boho_Reporte_Ventas.csv';
      
      await FileSystem.writeAsStringAsync(fileUri, csv, { encoding: FileSystem.EncodingType.UTF8 });
      
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(fileUri, { UTI: 'public.comma-separated-values-text', dialogTitle: 'Compartir Excel' });
      }
    } catch (e: any) {
      console.log(e);
      Alert.alert('Error', 'No se pudo generar el CSV.');
    }
  };

  const generatePDF = async () => {
    try {
      if (orders.length === 0) {
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
            </div>

            <h2 style="margin-top: 40px; color: #47311f;">Desglose por Etapas (Tiers)</h2>
            ${salesByTier.map(data => `
              <div style="margin-bottom: 25px; padding: 15px; border-left: 4px solid #686a54; background: #fff;">
                <h3 style="margin: 0 0 10px 0; color: #47311f;">${data.name}</h3>
                ${showRevenue ? `<p style="margin:0; font-size: 14px; color: #231e1a;"><strong>Ingresos:</strong> $${data.revenue}</p>` : ''}
                
                <p style="margin: 15px 0 5px 0; font-size: 12px; color: #686a54;">Ventas: ${data.sold}</p>
                
                <p style="margin: 15px 0 5px 0; font-size: 12px; color: #686a54;">Asistencia Real: ${data.entered} de ${data.sold} tickets vendidos (${Math.round(data.enteredPercentage)}%)</p>
                <div class="bar-track"><div class="bar-fill" style="width: ${Math.min(data.enteredPercentage, 100)}%; background-color: #47311f;"></div></div>
              </div>
            `).join('')}

            <h2 style="margin-top: 40px; color: #47311f;">Últimos Escaneos Registrados</h2>
            <table>
              <tr>
                <th>Nombre</th>
                <th>Tipo</th>
                <th>Cantidad</th>
                <th>Ingresaron</th>
              </tr>
              ${orders.filter(o => o.accessesUsed > 0).slice(0, 20).map(o => `
                <tr>
                  <td>${o.buyerInfo?.name}</td>
                  <td>${o.ticketName}</td>
                  <td>${o.quantity}</td>
                  <td>${o.accessesUsed}</td>
                </tr>
              `).join('')}
            </table>
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
      }
    } catch (e: any) {
      console.log(e);
      Alert.alert('Error', 'No se pudo generar el PDF.');
    }
  };

  // --- RENDER HELPERS ---
  const renderProgressBar = (percentage: number, color = '#686a54') => (
    <View style={styles.progressBarTrack}>
      <View style={[styles.progressBarFill, { width: `${Math.min(percentage, 100)}%`, backgroundColor: color }]} />
    </View>
  );

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#231e1a" />}
    >
      
      <Text style={styles.headerTitle}>Dashboard de Métricas</Text>

      {loading && orders.length === 0 ? (
        <ActivityIndicator size="large" color="#47311f" style={{ marginTop: 20 }} />
      ) : (
        <>
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
          </View>

          <Text style={styles.sectionTitle}>Desglose Financiero por Etapa</Text>
          
          <View style={styles.listContainer}>
            {salesByTier.length > 0 ? salesByTier.map((data, idx) => (
              <View key={data.name} style={[styles.tierRow, idx === salesByTier.length - 1 && { borderBottomWidth: 0 }]}>
                <View style={styles.tierHeader}>
                  <Text style={styles.tierName}>{data.name}</Text>
                  {showRevenue && <Text style={styles.tierRevenue}>${data.revenue}</Text>}
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
              <Text style={styles.emptyText}>No hay ventas aún.</Text>
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
        </>
      )}
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
