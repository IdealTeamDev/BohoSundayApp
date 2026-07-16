import fs from 'fs';

let content = fs.readFileSync('src/app/(admin)/qr-manager.tsx', 'utf8');

const stylesStart = content.indexOf('const styles = StyleSheet.create({');
if (stylesStart !== -1) {
  let stylesStr = content.substring(stylesStart);
  
  // Re-write styles from scratch basically for the ones that are broken
  stylesStr = stylesStr.replace(/sectionTitle: \{[^}]+\}/, `sectionTitle: {
    fontSize: 16,
    color: '#231e1a',
    fontFamily: 'Nunito_800ExtraBold',
    marginBottom: 16,
    letterSpacing: -0.3,
  }`);
  
  stylesStr = stylesStr.replace(/input: \{[^}]+\}/, `input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#686a54',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    fontFamily: 'Montserrat_600SemiBold',
    color: '#231e1a',
    fontSize: 15,
  }`);
  
  stylesStr = stylesStr.replace(/pickerItem: \{[^}]+\}/, `pickerItem: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#686a54',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
  }`);
  
  stylesStr = stylesStr.replace(/pickerItemActive: \{[^}]+\}/, `pickerItemActive: {
    backgroundColor: '#47311f',
    borderColor: '#47311f',
  }`);
  
  stylesStr = stylesStr.replace(/pickerItemTextActive: \{[^}]+\}/, `pickerItemTextActive: {
    color: '#ffffff',
  }`);
  
  stylesStr = stylesStr.replace(/submitBtn: \{[^}]+\}/, `submitBtn: {
    backgroundColor: '#47311f',
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 40,
  }`);
  
  stylesStr = stylesStr.replace(/submitBtnText: \{[^}]+\}/, `submitBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontFamily: 'Nunito_700Bold',
  }`);
  
  stylesStr = stylesStr.replace(/qrModalContent: \{[^}]+\}/, `qrModalContent: {
    backgroundColor: '#ffffff',
    margin: 24,
    marginTop: '30%',
    borderRadius: 32,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  }`);
  
  stylesStr = stylesStr.replace(/qrModalTitle: \{[^}]+\}/, `qrModalTitle: {
    fontSize: 24,
    color: '#231e1a',
    fontFamily: 'Nunito_800ExtraBold',
    marginTop: 16,
    marginBottom: 4,
    letterSpacing: -0.5,
  }`);
  
  stylesStr = stylesStr.replace(/qrModalSub: \{[^}]+\}/, `qrModalSub: {
    fontSize: 15,
    color: '#bdb39b',
    fontFamily: 'Montserrat_600SemiBold',
    marginBottom: 24,
  }`);
  
  stylesStr = stylesStr.replace(/qrModalFooter: \{[^}]+\}/, `qrModalFooter: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#f4efe9',
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
  }`);
  
  stylesStr = stylesStr.replace(/closeQrBtn: \{[^}]+\}/, `closeQrBtn: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 10,
    backgroundColor: '#f4efe9',
    padding: 8,
    borderRadius: 20,
  }`);
  
  stylesStr = stylesStr.replace(/modalContent: \{[^}]+\}/, `modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    height: '85%',
    padding: 24,
    paddingBottom: 0,
  }`);

  content = content.substring(0, stylesStart) + stylesStr;
}

// Check inline colors in JSX
content = content.replace(/color:\s*['"]#f4efe9['"]/g, "color: '#ffffff'");
content = content.replace(/color:\s*['"]#bdb39b['"]/g, "color: '#686a54'"); // Text that was #bdb39b might be too light

fs.writeFileSync('src/app/(admin)/qr-manager.tsx', content);
