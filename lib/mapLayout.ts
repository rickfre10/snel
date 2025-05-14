// lib/mapLayout.ts

// Interface para descrever um sub-path dentro de um distrito
interface DistrictSubPath {
  d: string; // Os dados do path (o valor do atributo 'd')
  fill?: string; // Opcional: Cor de preenchimento padrão deste sub-path
  stroke?: string; // Opcional: Cor da borda padrão deste sub-path
  strokeWidth?: string; // Opcional: Espessura da borda padrão deste sub-path (camelCase para JSX)
  // Outros atributos SVG específicos deste path, se houverem
}

// Interface para descrever a informação de layout de cada distrito
// Cada distrito é identificado por um ID e pode ser composto por um ou mais paths.
export interface DistrictLayoutInfo {
  id: string; // O ID do distrito (do <path id="..."> ou <g id="...">)
  paths: DistrictSubPath[]; // Array de sub-paths que compõem este distrito
}

// Array contendo as informações de layout para cada distrito,
// agrupadas por ID do path ou do grupo pai, extraídas do seu SVG.
// Este array deve ser gerado a partir do seu SVG em um passo de build ou script.
// Abaixo está o resultado da extração baseada no SVG que você forneceu.
export const haagarMapLayout: DistrictLayoutInfo[] = [
  // Distritos com um único path (extraídos de <path id="...">)
  { id: "605", paths: [{ d: "M2777.68 1607.5L3235.34 2400L2777.68 3192.5H1862.31L1404.66 2400L1862.31 1607.5H2777.68Z", fill: "#D9D9D9", stroke: "black", strokeWidth: "15" }] },
  { id: "604", paths: [{ d: "M1381.68 2407.5L1839.34 3200L1381.68 3992.5H466.307L8.66113 3200L466.307 2407.5H1381.68Z", fill: "#D9D9D9", stroke: "black", strokeWidth: "15" }] },
  { id: "603", paths: [{ d: "M4173.68 2407.5L4631.34 3200L4173.68 3992.5H3258.31L2800.66 3200L3258.31 2407.5H4173.68Z", fill: "#D9D9D9", stroke: "black", strokeWidth: "15" }] },
  { id: "602", paths: [{ d: "M4173.68 4007.5L4631.34 4800L4173.68 5592.5H3258.31L2800.66 4800L3258.31 4007.5H4173.68Z", fill: "#D9D9D9", stroke: "black", strokeWidth: "15" }] },
  { id: "601", paths: [{ d: "M2777.68 3207.5L3235.34 4000L2777.68 4792.5H1862.31L1404.66 4000L1862.31 3207.5H2777.68Z", fill: "#D9D9D9", stroke: "black", strokeWidth: "15" }] },
  { id: "330", paths: [{ d: "M23595.7 807.5L24053.3 1600L23595.7 2392.5H22680.3L22222.7 1600L22680.3 807.5H23595.7Z", fill: "#D9D9D9", stroke: "black", strokeWidth: "15" }] },
  { id: "329", paths: [{ d: "M23595.7 2407.5L24053.3 3200L23595.7 3992.5H22680.3L22222.7 3200L22680.3 2407.5H23595.7Z", fill: "#D9D9D9", stroke: "black", strokeWidth: "15" }] },
  { id: "328", paths: [{ d: "M18099.7 5592.5L18557.3 6385L18099.7 7177.5H17184.3L16726.7 6385L17184.3 5592.5H18099.7Z", fill: "#D9D9D9", stroke: "black", strokeWidth: "15" }] },
  { id: "327", paths: [{ d: "M18099.7 3992.5L18557.3 4785L18099.7 5577.5H17184.3L16726.7 4785L17184.3 3992.5H18099.7Z", fill: "#D9D9D9", stroke: "black", strokeWidth: "15" }] },
  { id: "325", paths: [{ d: "M20847.7 8792.5L21305.3 9585L20847.7 10377.5H19932.3L19474.7 9585L19932.3 8792.5H20847.7Z", fill: "#D9D9D9", stroke: "black", strokeWidth: "15" }] },
  { id: "326", paths: [{ d: "M22189.7 7992.5L22647.3 8785L22189.7 9577.5H21274.3L20816.7 8785L21274.3 7992.5H22189.7Z", fill: "#D9D9D9", stroke: "black", strokeWidth: "15" }] },
  { id: "324", paths: [{ d: "M19441.7 7992.5L19899.3 8785L19441.7 9577.5H18526.3L18068.7 8785L18526.3 7992.5H19441.7Z", fill: "#D9D9D9", stroke: "black", strokeWidth: "15" }] },
  { id: "323", paths: [{ d: "M22189.7 1592.5L22647.3 2385L22189.7 3177.5H21274.3L20816.7 2385L21274.3 1592.5H22189.7Z", fill: "#D9D9D9", stroke: "black", strokeWidth: "15" }] },
  { id: "322", paths: [{ d: "M20847.7 2392.5L21305.3 3185L20847.7 3977.5H19932.3L19474.7 3185L19932.3 2392.5H20847.7Z", fill: "#D9D9D9", stroke: "black", strokeWidth: "15" }] },
  { id: "321", paths: [{ d: "M19441.7 1592.5L19899.3 2385L19441.7 3177.5H18526.3L18068.7 2385L18526.3 1592.5H19441.7Z", fill: "#D9D9D9", stroke: "black", strokeWidth: "15" }] },
  { id: "320", paths: [{ d: "M23595.7 5607.5L24053.3 6400L23595.7 7192.5H22680.3L22222.7 6400L22680.3 5607.5H23595.7Z", fill: "#D9D9D9", stroke: "black", strokeWidth: "15" }] },
  { id: "319", paths: [{ d: "M22189.7 9592.5L22647.3 10385L22189.7 11177.5H21274.3L20816.7 10385L21274.3 9592.5H22189.7Z", fill: "#D9D9D9", stroke: "black", strokeWidth: "15" }] },
  { id: "318", paths: [{ d: "M23595.7 7207.5L24053.3 8000L23595.7 8792.5H22680.3L22222.7 8000L22680.3 7207.5H23595.7Z", fill: "#D9D9D9", stroke: "black", strokeWidth: "15" }] },
  { id: "317", paths: [{ d: "M23595.7 8807.5L24053.3 9600L23595.7 10392.5H22680.3L22222.7 9600L22680.3 8807.5H23595.7Z", fill: "#D9D9D9", stroke: "black", strokeWidth: "15" }] },
  { id: "316", paths: [{ d: "M20847.7 10392.5L21305.3 11185L20847.7 11977.5H19932.3L19474.7 11185L19932.3 10392.5H20847.7Z", fill: "#D9D9D9", stroke: "black", strokeWidth: "15" }] },
  { id: "315", paths: [{ d: "M18099.7 10392.5L18557.3 11185L18099.7 11977.5H17184.3L16726.7 11185L17184.3 10392.5H18099.7Z", fill: "#D9D9D9", stroke: "black", strokeWidth: "15" }] },
  { id: "314", paths: [{ d: "M18099.7 8792.5L18557.3 9585L18099.7 10377.5H17184.3L16726.7 9585L17184.3 8792.5H18099.7Z", fill: "#D9D9D9", stroke: "black", strokeWidth: "15" }] },
  { id: "313", paths: [{ d: "M18099.7 2392.5L18557.3 3185L18099.7 3977.5H17184.3L16726.7 3185L17184.3 2392.5H18099.7Z", fill: "#D9D9D9", stroke: "black", strokeWidth: "15" }] },
  { id: "312", paths: [{ d: "M23595.7 4007.5L24053.3 4800L23595.7 5592.5H22680.3L22222.7 4800L22680.3 4007.5H23595.7Z", fill: "#D9D9D9", stroke: "black", strokeWidth: "15" }] },
  { id: "311", paths: [{ d: "M18099.7 7192.5L18557.3 7985L18099.7 8777.5H17184.3L16726.7 7985L17184.3 7192.5H18099.7Z", fill: "#D9D9D9", stroke: "black", strokeWidth: "15" }] },
  { id: "310", paths: [{ d: "M19441.7 9592.5L19899.3 10385L19441.7 11177.5H18526.3L18068.7 10385L18526.3 9592.5H19441.7Z", fill: "#D9D9D9", stroke: "black", strokeWidth: "15" }] },
  { id: "309", paths: [{ d: "M22189.7 3192.5L22647.3 3985L22189.7 4777.5H21274.3L20816.7 3985L21274.3 3192.5H22189.7Z", fill: "#D9D9D9", stroke: "black", strokeWidth: "15" }] },
  { id: "308", paths: [{ d: "M22189.7 4792.5L22647.3 5585L22189.7 6377.5H21274.3L20816.7 5585L21274.3 4792.5H22189.7Z", fill: "#D9D9D9", stroke: "black", strokeWidth: "15" }] },
  { id: "307", paths: [{ d: "M22189.7 6392.5L22647.3 7185L22189.7 7977.5H21274.3L20816.7 7185L21274.3 6392.5H22189.7Z", fill: "#D9D9D9", stroke: "black", strokeWidth: "15" }] },
  { id: "306", paths: [{ d: "M19441.7 3192.5L19899.3 3985L19441.7 4777.5H18526.3L18068.7 3985L18526.3 3192.5H19441.7Z", fill: "#D9D9D9", stroke: "black", strokeWidth: "15" }] },
  { id: "305", paths: [{ d: "M19441.7 6392.5L19899.3 7185L19441.7 7977.5H18526.3L18068.7 7185L18526.3 6392.5H19441.7Z", fill: "#D9D9D9", stroke: "black", strokeWidth: "15" }] },
  { id: "304", paths: [{ d: "M20847.7 7192.5L21305.3 7985L20847.7 8777.5H19932.3L19474.7 7985L19932.3 7192.5H20847.7Z", fill: "#D9D9D9", stroke: "black", strokeWidth: "15" }] },
  { id: "303", paths: [{ d: "M20847.7 3992.5L21305.3 4785L20847.7 5577.5H19932.3L19474.7 4785L19932.3 3992.5H20847.7Z", fill: "#D9D9D9", stroke: "black", strokeWidth: "15" }] },
  { id: "302", paths: [{ d: "M19441.7 4792.5L19899.3 5585L19441.7 6377.5H18526.3L18068.7 5585L18526.3 4792.5H19441.7Z", fill: "#D9D9D9", stroke: "black", strokeWidth: "15" }] },
  { id: "301", paths: [{ d: "M20847.7 5592.5L21305.3 6385L20847.7 7177.5H19932.3L19474.7 6385L19932.3 5592.5H20847.7Z", fill: "#D9D9D9", stroke: "black", strokeWidth: "15" }] },
  { id: "421", paths: [{ d: "M24937.7 6407.5L25395.3 7200L24937.7 7992.5H24022.3L23564.7 7200L24022.3 6407.5H24937.7Z", fill: "#D9D9D9", stroke: "black", strokeWidth: "15" }] },
  { id: "420", paths: [{ d: "M24937.7 8007.5L25395.3 8800L24937.7 9592.5H24022.3L23564.7 8800L24022.3 8007.5H24937.7Z", fill: "#D9D9D9", stroke: "black", strokeWidth: "15" }] },
  { id: "419", paths: [{ d: "M26343.7 8807.5L26801.3 9600L26343.7 10392.5H25428.3L24970.7 9600L25428.3 8807.5H26343.7Z", fill: "#D9D9D9", stroke: "black", strokeWidth: "15" }] },
  { id: "418", paths: [{ d: "M24937.7 1607.5L25395.3 2400L24937.7 3192.5H24022.3L23564.7 2400L24022.3 1607.5H24937.7Z", fill: "#D9D9D9", stroke: "black", strokeWidth: "15" }] },
  { id: "417", paths: [{ d: "M26343.7 7207.5L26801.3 8000L26343.7 8792.5H25428.3L24970.7 8000L25428.3 7207.5H26343.7Z", fill: "#D9D9D9", stroke: "black", strokeWidth: "15" }] },
  { id: "416", paths: [{ d: "M27685.7 9607.5L28143.3 10400L27685.7 11192.5H26770.3L26312.7 10400L26770.3 9607.5H27685.7Z", fill: "#D9D9D9", stroke: "black", strokeWidth: "15" }] },
  { id: "415", paths: [{ d: "M26343.7 10407.5L26801.3 11200L26343.7 11992.5H25428.3L24970.7 11200L25428.3 10407.5H26343.7Z", fill: "#D9D9D9", stroke: "black", strokeWidth: "15" }] },
  { id: "414", paths: [{ d: "M24937.7 3207.5L25395.3 4000L24937.7 4792.5H24022.3L23564.7 4000L24022.3 3207.5H24937.7Z", fill: "#D9D9D9", stroke: "black", strokeWidth: "15" }] },
  { id: "413", paths: [{ d: "M24937.7 4807.5L25395.3 5600L24937.7 6392.5H24022.3L23564.7 5600L24022.3 4807.5H24937.7Z", fill: "#D9D9D9", stroke: "black", strokeWidth: "15" }] },
  { id: "412", paths: [{ d: "M26343.7 5607.5L26801.3 6400L26343.7 7192.5H25428.3L24970.7 6400L25428.3 5607.5H26343.7Z", fill: "#D9D9D9", stroke: "black", strokeWidth: "15" }] },
  { id: "411", paths: [{ d: "M24937.7 9607.5L25395.3 10400L24937.7 11192.5H24022.3L23564.7 10400L24022.3 9607.5H24937.7Z", fill: "#D9D9D9", stroke: "black", strokeWidth: "15" }] },
  { id: "410", paths: [{ d: "M26343.7 2407.5L26801.3 3200L26343.7 3992.5H25428.3L24970.7 3200L25428.3 2407.5H26343.7Z", fill: "#D9D9D9", stroke: "black", strokeWidth: "15" }] },
  { id: "409", paths: [{ d: "M27685.7 1607.5L28143.3 2400L27685.7 3192.5H26770.3L26312.7 2400L26770.3 1607.5H27685.7Z", fill: "#D9D9D9", stroke: "black", strokeWidth: "15" }] },
  { id: "408", paths: [{ d: "M26343.7 4007.5L26801.3 4800L26343.7 5592.5H25428.3L24970.7 4800L25428.3 4007.5H26343.7Z", fill: "#D9D9D9", stroke: "black", strokeWidth: "15" }] },
  { id: "407", paths: [{ d: "M27685.7 8007.5L28143.3 8800L27685.7 9592.5H26770.3L26312.7 8800L26770.3 8007.5H27685.7Z", fill: "#D9D9D9", stroke: "black", strokeWidth: "15" }] },
  { id: "406", paths: [{ d: "M27685.7 3207.5L28143.3 4000L27685.7 4792.5H26770.3L26312.7 4000L26770.3 3207.5H27685.7Z", fill: "#D9D9D9", stroke: "black", strokeWidth: "15" }] },
  { id: "405", paths: [{ d: "M27685.7 4807.5L28143.3 5600L27685.7 6392.5H26770.3L26312.7 5600L26770.3 4807.5H27685.7Z", fill: "#D9D9D9", stroke: "black", strokeWidth: "15" }] },
  { id: "404", paths: [{ d: "M27685.7 6407.5L28143.3 7200L27685.7 7992.5H26770.3L26312.7 7200L26770.3 6407.5H27685.7Z", fill: "#D9D9D9", stroke: "black", strokeWidth: "15" }] },
  { id: "403", paths: [{ d: "M29091.7 8807.5L29549.3 9600L29091.7 10392.5H28176.3L27718.7 9600L28176.3 8807.5H29091.7Z", fill: "#D9D9D9", stroke: "black", strokeWidth: "15" }] },
  { id: "402", paths: [{ d: "M29091.7 5607.5L29549.3 6400L29091.7 7192.5H28176.3L27718.7 6400L28176.3 5607.5H29091.7Z", fill: "#D9D9D9", stroke: "black", strokeWidth: "15" }] },
  { id: "401", paths: [{ d: "M29091.7 7207.5L29549.3 8000L29091.7 8792.5H28176.3L27718.7 8000L28176.3 7207.5H29091.7Z", fill: "#D9D9D9", stroke: "black", strokeWidth: "15" }] },
  { id: "101", paths: [{ d: "M5569.68 6422.5L6027.34 7215L5569.68 8007.5H4654.31L4196.66 7215L4654.31 6422.5H5569.68Z", fill: "#D9D9D9", stroke: "black", strokeWidth: "15" }] },
  { id: "252", paths: [{ d: "M8361.68 4807.5L8819.34 5600L8361.68 6392.5H7446.31L6988.66 5600L7446.31 4807.5H8361.68Z", fill: "#D9D9D9", stroke: "black", strokeWidth: "15" }] },
  { id: "251", paths: [{ d: "M9757.68 4007.5L10215.3 4800L9757.68 5592.5H8842.31L8384.66 4800L8842.31 4007.5H9757.68Z", fill: "#D9D9D9", stroke: "black", strokeWidth: "15" }] },
  { id: "246", paths: [{ d: "M6965.68 2392.5L7423.34 3185L6965.68 3977.5H6050.31L5592.66 3185L6050.31 2392.5H6965.68Z", fill: "#D9D9D9", stroke: "black", strokeWidth: "15" }] },
  { id: "245", paths: [{ d: "M8405.68 1592.5L8863.34 2385L8405.68 3177.5H7490.31L7032.66 2385L7490.31 1592.5H8405.68Z", fill: "#D9D9D9", stroke: "black", strokeWidth: "15" }] },
  { id: "244", paths: [{ d: "M8361.68 3207.5L8819.34 4000L8361.68 4792.5H7446.31L6988.66 4000L7446.31 3207.5H8361.68Z", fill: "#D9D9D9", stroke: "black", strokeWidth: "15" }] },
  { id: "243", paths: [{ d: "M9757.68 2407.5L10215.3 3200L9757.68 3992.5H8842.31L8384.66 3200L8842.31 2407.5H9757.68Z", fill: "#D9D9D9", stroke: "black", strokeWidth: "15" }] },
  { id: "242", paths: [{ d: "M5569.68 1607.5L6027.34 2400L5569.68 3192.5H4654.31L4196.66 2400L4654.31 1607.5H5569.68Z", fill: "#D9D9D9", stroke: "black", strokeWidth: "15" }] },
  { id: "241", paths: [{ d: "M5569.68 4807.5L6027.34 5600L5569.68 6392.5H4654.31L4196.66 5600L4654.31 4807.5H5569.68Z", fill: "#D9D9D9", stroke: "black", strokeWidth: "15" }] },
  { id: "240", paths: [{ d: "M5569.68 3207.5L6027.34 4000L5569.68 4792.5H4654.31L4196.66 4000L4654.31 3207.5H5569.68Z", fill: "#D9D9D9", stroke: "black", strokeWidth: "15" }] },
  { id: "234", paths: [{ d: "M6965.68 4007.5L7423.34 4800L6965.68 5592.5H6050.31L5592.66 4800L6050.31 4007.5H6965.68Z", fill: "#D9D9D9", stroke: "black", strokeWidth: "15" }] },
  { id: "230", paths: [{ d: "M12549.7 807.5L13007.3 1600L12549.7 2392.5H11634.3L11176.7 1600L11634.3 807.5H12549.7Z", fill: "#D9D9D9", stroke: "black", strokeWidth: "15" }] },
  { id: "229", paths: [{ d: "M13945.7 4807.5L14403.3 5600L13945.7 6392.5H13030.3L12572.7 5600L13030.3 4807.5H13945.7Z", fill: "#D9D9D9", stroke: "black", strokeWidth: "15" }] },
  { id: "228", paths: [{ d: "M12549.7 4007.5L13007.3 4800L12549.7 5592.5H11634.3L11176.7 4800L11634.3 4007.5H12549.7Z", fill: "#D9D9D9", stroke: "black", strokeWidth: "15" }] },
  { id: "226", paths: [{ d: "M12549.7 2407.5L13007.3 3200L12549.7 3992.5H11634.3L11176.7 3200L11634.3 2407.5H12549.7Z", fill: "#D9D9D9", stroke: "black", strokeWidth: "15" }] },
  { id: "225", paths: [{ d: "M12549.7 5607.5L13007.3 6400L12549.7 7192.5H11634.3L11176.7 6400L11634.3 5607.5H12549.7Z", fill: "#D9D9D9", stroke: "black", strokeWidth: "15" }] },
  { id: "224", paths: [{ d: "M5569.68 8022.5L6027.34 8815L5569.68 9607.5H4654.31L4196.66 8815L4654.31 8022.5H5569.68Z", fill: "#D9D9D9", stroke: "black", strokeWidth: "15" }] },
  { id: "223", paths: [{ d: "M6965.68 5607.5L7423.34 6400L6965.68 7192.5H6050.31L5592.66 6400L6050.31 5607.5H6965.68Z", fill: "#D9D9D9", stroke: "black", strokeWidth: "15" }] },
  { id: "222", paths: [{ d: "M9757.68 7207.5L10215.3 8000L9757.68 8792.5H8842.31L8384.66 8000L8842.31 7207.5H9757.68Z", fill: "#D9D9D9", stroke: "black", strokeWidth: "15" }] },
  { id: "221", paths: [{ d: "M13945.7 6407.5L14403.3 7200L13945.7 7992.5H13030.3L12572.7 7200L13030.3 6407.5H13945.7Z", fill: "#D9D9D9", stroke: "black", strokeWidth: "15" }] },
  { id: "218", paths: [{ d: "M9757.68 8807.5L10215.3 9600L9757.68 10392.5H8842.31L8384.66 9600L8842.31 8807.5H9757.68Z", fill: "#D9D9D9", stroke: "black", strokeWidth: "15" }] },
  { id: "217", paths: [{ d: "M8361.68 8007.5L8819.34 8800L8361.68 9592.5H7446.31L6988.66 8800L7446.31 8007.5H8361.68Z", fill: "#D9D9D9", stroke: "black", strokeWidth: "15" }] },
  { id: "216", paths: [{ d: "M6965.68 8822.5L7423.34 9615L6965.68 10407.5H6050.31L5592.66 9615L6050.31 8822.5H6965.68Z", fill: "#D9D9D9", stroke: "black", strokeWidth: "15" }] },
  { id: "215", paths: [{ d: "M6965.68 7207.5L7423.34 8000L6965.68 8792.5H6050.31L5592.66 8000L6050.31 7207.5H6965.68Z", fill: "#D9D9D9", stroke: "black", strokeWidth: "15" }] },
  { id: "214", paths: [{ d: "M13945.7 3207.5L14403.3 4000L13945.7 4792.5H13030.3L12572.7 4000L13030.3 3207.5H13945.7Z", fill: "#D9D9D9", stroke: "black", strokeWidth: "15" }] },
  { id: "212", paths: [{ d: "M13945.7 1607.5L14403.3 2400L13945.7 3192.5H13030.3L12572.7 2400L13030.3 1607.5H13945.7Z", fill: "#D9D9D9", stroke: "black", strokeWidth: "15" }] },
  { id: "211", paths: [{ d: "M12549.7 7207.5L13007.3 8000L12549.7 8792.5H11634.3L11176.7 8000L11634.3 7207.5H12549.7Z", fill: "#D9D9D9", stroke: "black", strokeWidth: "15" }] },
  { id: "208", paths: [{ d: "M12549.7 8807.5L13007.3 9600L12549.7 10392.5H11634.3L11176.7 9600L11634.3 8807.5H12549.7Z", fill: "#D9D9D9", stroke: "black", strokeWidth: "15" }] },
  { id: "206", paths: [{ d: "M13945.7 8007.5L14403.3 8800L13945.7 9592.5H13030.3L12572.7 8800L13030.3 8007.5H13945.7Z", fill: "#D9D9D9", stroke: "black", strokeWidth: "15" }] },
  { id: "205", paths: [{ d: "M12549.7 10407.5L13007.3 11200L12549.7 11992.5H11634.3L11176.7 11200L11634.3 10407.5H12549.7Z", fill: "#D9D9D9", stroke: "black", strokeWidth: "15" }] },
  { id: "204", paths: [{ d: "M13945.7 9607.5L14403.3 10400L13945.7 11192.5H13030.3L12572.7 10400L13030.3 9607.5H13945.7Z", fill: "#D9D9D9", stroke: "black", strokeWidth: "15" }] },
  { id: "202", paths: [{ d: "M8361.68 6407.5L8819.34 7200L8361.68 7992.5H7446.31L6988.66 7200L7446.31 6407.5H8361.68Z", fill: "#D9D9D9", stroke: "black", strokeWidth: "15" }] },
  { id: "201", paths: [{ d: "M9757.68 5607.5L10215.3 6400L9757.68 7192.5H8842.31L8384.66 6400L8842.31 5607.5H9757.68Z", fill: "#D9D9D9", stroke: "black", strokeWidth: "15" }] },
  { id: "250", paths: [{ d: "M11153.7 4807.5L11611.3 5600L11153.7 6392.5H10238.3L9780.66 5600L10238.3 4807.5H11153.7Z", fill: "#D9D9D9", stroke: "black", strokeWidth: "15" }] },
  { id: "233", paths: [{ d: "M11153.7 3207.5L11611.3 4000L11153.7 4792.5H10238.3L9780.66 4000L10238.3 3207.5H11153.7Z", fill: "#D9D9D9", stroke: "black", strokeWidth: "15" }] },
  { id: "232", paths: [{ d: "M11153.7 1607.5L11611.3 2400L11153.7 3192.5H10238.3L9780.66 2400L10238.3 1607.5H11153.7Z", fill: "#D9D9D9", stroke: "black", strokeWidth: "15" }] },
  { id: "210", paths: [{ d: "M11153.7 8007.5L11611.3 8800L11153.7 9592.5H10238.3L9780.66 8800L10238.3 8007.5H11153.7Z", fill: "#D9D9D9", stroke: "black", strokeWidth: "15" }] },
  { id: "209", paths: [{ d: "M11153.7 9607.5L11611.3 10400L11153.7 11192.5H10238.3L9780.66 10400L10238.3 9607.5H11153.7Z", fill: "#D9D9D9", stroke: "black", strokeWidth: "15" }] },
  { id: "203", paths: [{ d: "M11153.7 6407.5L11611.3 7200L11153.7 7992.5H10238.3L9780.66 7200L10238.3 6407.5H11153.7Z", fill: "#D9D9D9", stroke: "black", strokeWidth: "15" }] },
  { id: "249", paths: [{ d: "M16693.7 1592.5L17151.3 2385L16693.7 3177.5H15778.3L15320.7 2385L15778.3 1592.5H16693.7Z", fill: "#D9D9D9", stroke: "black", strokeWidth: "15" }] },
  { id: "248", paths: [{ d: "M16693.7 3192.5L17151.3 3985L16693.7 4777.5H15778.3L15320.7 3985L15778.3 3192.5H16693.7Z", fill: "#D9D9D9", stroke: "black", strokeWidth: "15" }] },
  { id: "239", paths: [{ d: "M16693.7 6392.5L17151.3 7185L16693.7 7977.5H15778.3L15320.7 7185L15778.3 6392.5H16693.7Z", fill: "#D9D9D9", stroke: "black", strokeWidth: "15" }] },
  { id: "238", paths: [{ d: "M16693.7 7992.5L17151.3 8785L16693.7 9577.5H15778.3L15320.7 8785L15778.3 7992.5H16693.7Z", fill: "#D9D9D9", stroke: "black", strokeWidth: "15" }] },
  { id: "236", paths: [{ d: "M16693.7 4792.5L17151.3 5585L16693.7 6377.5H15778.3L15320.7 5585L15778.3 4792.5H16693.7Z", fill: "#D9D9D9", stroke: "black", strokeWidth: "15" }] },
  { id: "219", paths: [{ d: "M16693.7 9592.5L17151.3 10385L16693.7 11177.5H15778.3L15320.7 10385L15778.3 9592.5H16693.7Z", fill: "#D9D9D9", stroke: "black", strokeWidth: "15" }] },
  { id: "247", paths: [{ d: "M15341.7 792.5L15799.3 1585L15341.7 2377.5H14426.3L13968.7 1585L14426.3 792.5H15341.7Z", fill: "#D9D9D9", stroke: "black", strokeWidth: "15" }] },
  { id: "237", paths: [{ d: "M15341.7 7192.5L15799.3 7985L15341.7 8777.5H14426.3L13968.7 7985L14426.3 7192.5H15341.7Z", fill: "#D9D9D9", stroke: "black", strokeWidth: "15" }] },
  { id: "235", paths: [{ d: "M15341.7 3992.5L15799.3 4785L15341.7 5577.5H14426.3L13968.7 4785L14426.3 3992.5H15341.7Z", fill: "#D9D9D9", stroke: "black", strokeWidth: "15" }] },
  { id: "231", paths: [{ d: "M15341.7 5592.5L15799.3 6385L15341.7 7177.5H14426.3L13968.7 6385L14426.3 5592.5H15341.7Z", fill: "#D9D9D9", stroke: "black", strokeWidth: "15" }] },
  { id: "227", paths: [{ d: "M15341.7 2392.5L15799.3 3185L15341.7 3977.5H14426.3L13968.7 3185L14426.3 2392.5H15341.7Z", fill: "#D9D9D9", stroke: "black", strokeWidth: "15" }] },
  { id: "220", paths: [{ d: "M15341.7 8792.5L15799.3 9585L15341.7 10377.5H14426.3L13968.7 9585L14426.3 8792.5H15341.7Z", fill: "#D9D9D9", stroke: "black", strokeWidth: "15" }] },
  { id: "207", paths: [{ d: "M15341.7 10392.5L15799.3 11185L15341.7 11977.5H14426.3L13968.7 11185L14426.3 10392.5H15341.7Z", fill: "#D9D9D9", stroke: "black", strokeWidth: "15" }] },

  // Distritos com múltiplos paths dentro de <g id="..."> (agrupados)
  {
      id: "213",
      paths: [
          { d: "M13950 1600H13026L12564 800L13026 0H13950L14412 800.004L13950 1600Z", fill: "#D9D9D9" },
          { d: "M13950 1600H13026L12564 800L13026 0H13950L14412 800.004L13950 1600Z", fill: "#D9D9D9" },
          { d: "M13950 1600H13026L12564 800L13026 0H13950L14412 800.004L13950 1600Z", stroke: "black", strokeWidth: "15", fill: "#D9D9D9" },
      ]
  },
  {
      id: "511",
      paths: [
          { d: "M2782.01 8000H1857.98L1396 7200L1857.98 6400H2782.01L3244 7200L2782.01 8000Z", fill: "#D9D9D9" },
          { d: "M2782.01 8000H1857.98L1396 7200L1857.98 6400H2782.01L3244 7200L2782.01 8000Z", fill: "#D9D9D9" },
          { d: "M2782.01 8000H1857.98L1396 7200L1857.98 6400H2782.01L3244 7200L2782.01 8000Z", stroke: "black", strokeWidth: "15" },
      ]
  },
   {
      id: "510",
      paths: [
          { d: "M4178.01 8800H3253.98L2792 8000L3253.98 7200H4178.01L4640 8000L4178.01 8800Z", fill: "#D9D9D9" },
          { d: "M4178.01 8800H3253.98L2792 8000L3253.98 7200H4178.01L4640 8000L4178.01 8800Z", fill: "#D9D9D9" },
          { d: "M4178.01 8800H3253.98L2792 8000L3253.98 7200H4178.01L4640 8000L4178.01 8800Z", stroke: "black", strokeWidth: "15" },
      ]
  },
   {
      id: "509",
      paths: [
          { d: "M1386.01 7200H461.977L0 6400L461.977 5600H1386.01L1848 6400L1386.01 7200Z", fill: "#D9D9D9" },
          { d: "M1386.01 7200H461.977L0 6400L461.977 5600H1386.01L1848 6400L1386.01 7200Z", fill: "#D9D9D9" },
          { d: "M1386.01 7200H461.977L0 6400L461.977 5600H1386.01L1848 6400L1386.01 7200Z", stroke: "black", strokeWidth: "15" },
      ]
  },
   {
      id: "508",
      paths: [
          { d: "M1386.01 5600H461.977L0 4800L461.977 4000H1386.01L1848 4800L1386.01 5600Z", fill: "#D9D9D9" },
          { d: "M1386.01 5600H461.977L0 4800L461.977 4000H1386.01L1848 4800L1386.01 5600Z", fill: "#D9D9D9" },
          { d: "M1386.01 5600H461.977L0 4800L461.977 4000H1386.01L1848 4800L1386.01 5600Z", stroke: "black", strokeWidth: "15" },
      ]
  },
  {
      id: "507",
      paths: [
          { d: "M4178.01 7200H3253.98L2792 6400L3253.98 5600H4178.01L4640 6400L4178.01 7200Z", fill: "#D9D9D9" },
          { d: "M4178.01 7200H3253.98L2792 6400L3253.98 5600H4178.01L4640 6400L4178.01 7200Z", fill: "#D9D9D9" },
          { d: "M4178.01 7200H3253.98L2792 6400L3253.98 5600H4178.01L4640 6400L4178.01 7200Z", stroke: "black", strokeWidth: "15" },
      ]
  },
  {
      id: "506",
      paths: [
          { d: "M2782.01 6400H1857.98L1396 5600L1857.98 4800H2782.01L3244 5600L2782.01 6400Z", fill: "#D9D9D9" },
          { d: "M2782.01 6400H1857.98L1396 5600L1857.98 4800H2782.01L3244 5600L2782.01 6400Z", fill: "#D9D9D9" },
          { d: "M2782.01 6400H1857.98L1396 5600L1857.98 4800H2782.01L3244 5600L2782.01 6400Z", stroke: "black", strokeWidth: "15" },
      ]
  },
  {
      id: "505",
      paths: [
          { d: "M4178.01 10400H3253.98L2792 9600L3253.98 8800H4178.01L4640 9600L4178.01 10400Z", fill: "#D9D9D9" },
          { d: "M4178.01 10400H3253.98L2792 9600L3253.98 8800H4178.01L4640 9600L4178.01 10400Z", fill: "#D9D9D9" },
          { d: "M4178.01 10400H3253.98L2792 9600L3253.98 8800H4178.01L4640 9600L4178.01 10400Z", stroke: "black", strokeWidth: "15" },
      ]
  },
  {
      id: "504",
      paths: [
          { d: "M1386.01 8800H461.977L0 8000L461.977 7200H1386.01L1848 8000L1386.01 8800Z", fill: "#D9D9D9" },
          { d: "M1386.01 8800H461.977L0 8000L461.977 7200H1386.01L1848 8000L1386.01 8800Z", fill: "#D9D9D9" },
          { d: "M1386.01 8800H461.977L0 8000L461.977 7200H1386.01L1848 8000L1386.01 8800Z", stroke: "black", strokeWidth: "15" },
      ]
  },
  {
      id: "503",
      paths: [
          { d: "M2782.01 11200H1857.98L1396 10400L1857.98 9600H2782.01L3244 10400L2782.01 11200Z", fill: "#D9D9D9" },
          { d: "M2782.01 11200H1857.98L1396 10400L1857.98 9600H2782.01L3244 10400L2782.01 11200Z", fill: "#D9D9D9" },
          { d: "M2782.01 11200H1857.98L1396 10400L1857.98 9600H2782.01L3244 10400L2782.01 11200Z", stroke: "black", strokeWidth: "15" },
      ]
  },
  {
      id: "502",
      paths: [
          { d: "M1386.01 10400H461.977L0 9600L461.977 8800H1386.01L1848 9600L1386.01 10400Z", fill: "#D9D9D9" },
          { d: "M1386.01 10400H461.977L0 9600L461.977 8800H1386.01L1848 9600L1386.01 10400Z", fill: "#D9D9D9" },
          { d: "M1386.01 10400H461.977L0 9600L461.977 8800H1386.01L1848 9600L1386.01 10400Z", stroke: "black", strokeWidth: "15" },
      ]
  },
   {
      id: "501",
      paths: [
          { d: "M2782.01 9600H1857.98L1396 8800L1857.98 8000H2782.01L3244 8800L2782.01 9600Z", fill: "#D9D9D9" },
          { d: "M2782.01 9600H1857.98L1396 8800L1857.98 8000H2782.01L3244 8800L2782.01 9600Z", fill: "#D9D9D9" },
          { d: "M2782.01 9600H1857.98L1396 8800L1857.98 8000H2782.01L3244 8800L2782.01 9600Z", stroke: "black", strokeWidth: "15" },
      ]
  },
];

// Dimensões gerais do SVG (extraídas do seu código SVG fornecido)
export const mapDimensions = {
  width: "29558",
  height: "12000",
  viewBox: "0 0 29558 12000"
};