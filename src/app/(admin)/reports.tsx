import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Dimensions, Platform } from 'react-native';
import { useDatabaseStore } from '../../store/useDatabaseStore';
import { FileText, Download, DollarSign, Users } from 'lucide-react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { Ticket, Tier } from '../../types';
import { PieChart, BarChart } from 'react-native-chart-kit';

const screenWidth = Dimensions.get("window").width - 32;
const COLORS = ['#686a54', '#47311f', '#bdb39b', '#231e1a', '#d9d1c0'];

const chartConfig = {
  backgroundGradientFrom: "#d9d1c0",
  backgroundGradientFromOpacity: 0,
  backgroundGradientTo: "#d9d1c0",
  backgroundGradientToOpacity: 0,
  color: (opacity = 1) => `rgba(71, 49, 31, ${opacity})`, // #47311f
  labelColor: (opacity = 1) => `rgba(104, 106, 84, 1)`, // #686a54
  strokeWidth: 2,
  barPercentage: 0.7,
  decimalPlaces: 0,
  fillShadowGradientFrom: '#47311f',
  fillShadowGradientFromOpacity: 1,
  fillShadowGradientTo: '#686a54',
  fillShadowGradientToOpacity: 0.8,
  propsForLabels: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 11
  }
};

export default function ReportsScreen() {
  const { tiers, tickets } = useDatabaseStore();
  const [filterTab, setFilterTab] = useState<'finance' | 'attendance'>('finance');

  const ticketsArr = Object.values(tickets || {}) as Ticket[];
  
  const totalCapacity = ticketsArr.reduce((acc, t) => acc + t.capacity, 0);
  const totalArrived = ticketsArr.reduce((acc, t) => acc + t.used, 0);
  const overallPercentage = totalCapacity > 0 ? (totalArrived / totalCapacity) * 100 : 0;

  const salesByTier = tiers.map(tier => {
    const tix = ticketsArr.filter(t => t.tierId === tier.id);
    const sold = tix.reduce((acc, t) => acc + t.capacity, 0);
    const revenue = sold * tier.price;
    const percentage = tier.capacity > 0 ? (sold / tier.capacity) * 100 : 0;
    return { tier, sold, revenue, percentage };
  });

  const totalRevenue = salesByTier.reduce((acc, t) => acc + t.revenue, 0);

  // Data for Charts
  const pieData = salesByTier.filter(t => t.revenue > 0).map((item, index) => ({
    name: item.tier.name,
    population: item.revenue,
    color: COLORS[index % COLORS.length],
    legendFontColor: '#231e1a',
    legendFontSize: 12
  }));

  const barData = {
    labels: salesByTier.map(t => t.tier.name.length > 12 ? t.tier.name.substring(0, 10) + '...' : t.tier.name),
    datasets: [
      {
        data: salesByTier.map(t => t.sold)
      }
    ]
  };

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
        Alert.alert('Aviso', 'No hay datos de tickets para exportar.');
        return;
      }
      const htmlContent = `
        <html>
          <head>
            <style>
              body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #231e1a; background-color: #f4efe9; }
              h1 { color: #47311f; font-size: 32px; border-bottom: 2px solid #686a54; padding-bottom: 10px; }
              .summary-box { background-color: #d9d1c0; padding: 20px; border-radius: 12px; margin-top: 20px; }
              .stat { font-size: 24px; font-weight: bold; color: #47311f; }
              .chart-section { margin-top: 30px; }
              .bar-track { background-color: #bdb39b; border-radius: 8px; height: 20px; width: 100%; margin-top: 5px; overflow: hidden; }
              .bar-fill { background-color: #686a54; height: 100%; border-radius: 8px; }
              table { width: 100%; border-collapse: collapse; margin-top: 30px; }
              th, td { text-align: left; padding: 12px; border-bottom: 1px solid #bdb39b; }
              th { background-color: #d9d1c0; color: #47311f; font-weight: 600; }
            </style>
          </head>
          <body>
            <h1>Boho Sunday - Reporte Final</h1>
            <p>Fecha de emisión: ${new Date().toLocaleDateString()}</p>
            
            <div class="summary-box">
              <h2>Resumen de Asistencia e Ingresos</h2>
              <p>Tickets Comprados: <span class="stat">${totalCapacity}</span></p>
              <p>Personas que Ingresaron: <span class="stat">${totalArrived}</span></p>
              <p>Ocupación Real: <span class="stat">${Math.round(overallPercentage)}%</span></p>
              <p>Ingresos Totales (Tiers): <span class="stat">$${totalRevenue}</span></p>
            </div>

            <div class="chart-section">
              <h2>Gráfica: Ocupación de Etapas (Aforo)</h2>
              ${salesByTier.map(data => `
                <div style="margin-bottom: 15px;">
                  <p style="margin:0; font-weight:bold;">${data.tier.name} - ${Math.round(data.percentage)}% vendido (${data.sold}/${data.tier.capacity})</p>
                  <p style="margin:0; font-size: 12px; color: #686a54;">Ingresos: $${data.revenue}</p>
                  <div class="bar-track">
                    <div class="bar-fill" style="width: ${Math.min(data.percentage, 100)}%;"></div>
                  </div>
                </div>
              `).join('')}
            </div>

            <h2>Desglose por Asistente</h2>
            <table>
              <tr>
                <th>Nombre</th>
                <th>Código QR</th>
                <th>Comprados</th>
                <th>Ingresaron</th>
                <th>Estado</th>
              </tr>
              ${ticketsArr.map(t => `
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

  return (
    <ScrollView style={styles.container}>
      
      {/* Tabs de Filtro */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, filterTab === 'finance' && styles.tabActive]} 
          onPress={() => setFilterTab('finance')}
        >
          <DollarSign color={filterTab === 'finance' ? '#f4efe9' : '#686a54'} size={20} />
          <Text style={[styles.tabText, filterTab === 'finance' && styles.tabTextActive]}>Finanzas</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, filterTab === 'attendance' && styles.tabActive]} 
          onPress={() => setFilterTab('attendance')}
        >
          <Users color={filterTab === 'attendance' ? '#f4efe9' : '#686a54'} size={20} />
          <Text style={[styles.tabText, filterTab === 'attendance' && styles.tabTextActive]}>Aforo</Text>
        </TouchableOpacity>
      </View>

      {/* Contenido según Filtro */}
      <View style={styles.chartContainer}>
        {filterTab === 'finance' ? (
          <>
            <View style={{ alignItems: 'center', marginBottom: 20 }}>
              <Text style={styles.heroTitle}>Ingresos Estimados</Text>
              <Text style={styles.heroBigNumber}>${totalRevenue}</Text>
            </View>
            <Text style={styles.chartTitle}>Distribución de Ingresos</Text>
            {pieData.length > 0 ? (
              <PieChart
                data={pieData}
                width={screenWidth}
                height={220}
                chartConfig={chartConfig}
                accessor={"population"}
                backgroundColor={"transparent"}
                paddingLeft={"15"}
                absolute
              />
            ) : (
              <Text style={{ color: '#bdb39b', marginTop: 20 }}>No hay ventas registradas aún.</Text>
            )}
          </>
        ) : (
          <>
            <View style={{ alignItems: 'center', marginBottom: 20 }}>
              <Text style={styles.heroTitle}>Aforo Total</Text>
              <Text style={styles.heroBigNumber}>{totalCapacity} pax</Text>
            </View>
            <Text style={styles.chartTitle}>Entradas Vendidas por Etapa</Text>
            {salesByTier.length > 0 ? (
              <BarChart
                data={barData}
                width={screenWidth - 20}
                height={240}
                yAxisLabel=""
                yAxisSuffix=""
                chartConfig={chartConfig}
                verticalLabelRotation={0}
                showValuesOnTopOfBars={true}
                fromZero={true}
                withInnerLines={false}
                style={{ marginVertical: 8, borderRadius: 16 }}
              />
            ) : (
              <Text style={{ color: '#bdb39b', marginTop: 20 }}>No hay etapas creadas aún.</Text>
            )}
          </>
        )}
      </View>

      <Text style={styles.title}>Exportación de Datos</Text>
      
      <View style={styles.actionRow}>
        <TouchableOpacity style={[styles.exportBtn, { backgroundColor: '#686a54' }]} onPress={generateCSV}>
          <FileText color="#f4efe9" size={24} />
          <Text style={styles.exportBtnText}>Exportar a Excel (CSV)</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.exportBtn, { backgroundColor: '#47311f' }]} onPress={generatePDF}>
          <Download color="#f4efe9" size={24} />
          <Text style={styles.exportBtnText}>Exportar a PDF Estático</Text>
        </TouchableOpacity>
      </View>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4efe9',
    padding: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#d9d1c0',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#bdb39b',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: '#47311f',
  },
  tabText: {
    color: '#686a54',
    fontSize: 14,
    fontFamily: 'NunitoSans_600SemiBold',
    marginLeft: 8,
  },
  tabTextActive: {
    color: '#f4efe9',
  },
  title: {
    color: '#231e1a',
    fontSize: 18,
    fontFamily: 'NunitoSans_600SemiBold',
    marginBottom: 16,
  },
  chartContainer: {
    backgroundColor: '#d9d1c0',
    borderRadius: 24,
    padding: 16,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#bdb39b',
    alignItems: 'center',
  },
  heroTitle: {
    color: '#686a54',
    fontSize: 14,
    fontFamily: 'NunitoSans_600SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  heroBigNumber: {
    color: '#47311f',
    fontSize: 48,
    fontFamily: 'NunitoSans_600SemiBold',
    marginVertical: 4,
  },
  chartTitle: {
    color: '#231e1a',
    fontSize: 16,
    fontFamily: 'NunitoSans_600SemiBold',
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  actionRow: {
    flexDirection: 'column',
    gap: 16,
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
