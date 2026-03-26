import JSZip from 'jszip'
export const parseFlightPlan = async (url) => {

    const response = await fetch(url);
    // 验证Content-Type
    console.log('KMZ Content-Type:', response.headers.get('Content-Type'));
    const buffer = await response.arrayBuffer();
    const zip = new JSZip();
    const content = await zip.loadAsync(buffer);
    // 验证zip完整性
    if (content.files.length === 0) throw new Error('空文件或损坏的KMZ');

    // 获取waylines.wpml文件内容
    const wpmlFile = content.file(/waylines\.wpml$/i)[0];
    if (!wpmlFile) throw new Error('未找到waylines.wpml文件');
    const wpmlContent = await wpmlFile.async('string');

  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(wpmlContent, "text/xml");
  
  // 提取总航程和时长
  const namespaceURI = 'http://www.dji.com/wpmz/1.0.6';
  const distance = xmlDoc.getElementsByTagNameNS(namespaceURI, 'distance')[0]?.textContent;
  const duration = xmlDoc.getElementsByTagNameNS(namespaceURI, 'duration')[0]?.textContent;

  // 获取第一个航点坐标
  const firstPlacemark = xmlDoc.querySelector('Placemark');
  const coordinates = firstPlacemark?.querySelector('coordinates')?.textContent?.trim();
  
  return {
    distance: parseFloat(distance) || 0,
    duration: parseFloat(duration) || 0,
    firstCoordinate: coordinates?.split(',').map(Number)?.slice(0,2) || null
  };
}