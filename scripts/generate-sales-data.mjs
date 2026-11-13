import fs from 'node:fs';
import path from 'node:path';

const themes = JSON.parse(fs.readFileSync('data/themes.json', 'utf8')).filter(t => t.active);

// Couple / Individual names pool
const rawNames = [
  // Jawa / Populer
  "Rian & Putri", "Dimas & Anisa", "Fajar & Dini", "Budi & Maya", "Kevin & Natasya",
  "Rizky & Amanda", "Iqbal & Zahra", "Aldi & Tiara", "Bayu & Laras", "Bagas & Cindy",
  "Taufik & Nurul", "Rangga & Cinta", "Aditya & Bella", "Reza & Nadya", "Gilang & Tari",
  "Ilham & Syifa", "Rafi & Sarah", "Arif & Melati", "Satria & Wulan", "Rendra & Kirana",
  "Danang & Sekar", "Pandu & Retno", "Galih & Ratna", "Yoga & Dewi", "Giri & Ayu",
  "Surya & Anggi", "Wahyu & Triana", "Prasetyo & Dian", "Agung & Lestari", "Sigit & Novita",
  
  // Sunda & Sekitarnya
  "Cecep & Gina", "Asep & Rina", "Deden & Neng Fitri", "Faisal & Nenden", "Riki & Santi",
  "Agis & Imas", "Dadang & Ai Kartika", "Wildan & Yuliana", "Hilman & Dea", "Fahmi & Silvi",
  
  // Sumatera (Minang, Batak, Melayu)
  "Rahmat & Uni Desi", "Randi & Elvi", "Syahrul & Maya Sari", "Fauzan & Silvia",
  "Bonaventura & Grace", "Tigor & Christine", "Hotman & Ester", "Daniel & Yohana",
  "Marcell & Jessica", "Hendra & Siska", "Irwan & Linda", "Roni & Fitria",
  
  // Sulawesi, Bali, NTB, NTT, Kalimantan
  "Andi Baso & Tenri", "Fadli & Musdalifah", "Irfan & Wardah", "Kahar & Rahma",
  "I Made Arya & Ni Luh Putu", "I Wayan Gede & Ni Kadek", "Ketut Rama & Luh Sita",
  "Lalu Haikal & Baiq Nabila", "Lalu Danu & Baiq Rizka", "Gusti & Kadek Astari",
  "Marten & Maria", "Frans & Natalia", "Yohanes & Theresia",
  "Gusti Rian & Indah", "Anang & Rusmiati", "Dedy & Helda", "Rico & Febby",
  
  // Gelar / Profesi / Elegan
  "dr. Reza & drg. Sarah", "dr. Kevin & Natasha, M.Farm", "dr. Dimas & dr. Alifia",
  "Kapten Rian & Lettu Diah", "Ibnu & dr. Fitriani", "Farhan, S.T. & Nabila, S.Pd",
  "Bagus, S.Kom & Rina, M.Si", "Zacky & dr. Sheila", "drg. Radit & Bella",
  
  // Modern / Urban Minimalist
  "Leo & Michelle", "Christian & Stephanie", "Jason & Vanessa", "Nathan & Evelyn",
  "Darren & Felicia", "Jonathan & Audrey", "Kenneth & Patricia", "David & Clarissa",
  "Michael & Giselle", "Julian & Andrea", "Samuel & Kimberly", "Nicholas & Sherly",
  
  // Syukuran / Khitan / Aqiqah / Ultah
  "Keluarga Hendra Pratama", "Bunda Alifia & Ayah Danu", "Ibu Ratih & Kel.",
  "Keluarga Bpk. H. Syarif", "Ayah Fikri & Bunda Dina", "Keluarga dr. Hendro",
  "Bunda Meisya", "Keluarga Bpk. Gunawan", "Ayah Rizwan & Bunda Eva",
  "Mama Keisha & Papa Arka", "Keluarga H. Mursyid", "Bunda Kirana",
  "Ayah Dimas & Bunda Laras", "Keluarga Bpk. Wijaya", "Mama Alisha"
];

// Indonesian cities & regencies
const cities = [
  "Jakarta Selatan", "Jakarta Barat", "Jakarta Timur", "Jakarta Pusat", "Jakarta Utara",
  "Surabaya", "Bandung", "Medan", "Semarang", "Makassar", "Tangerang Selatan", "Kota Tangerang",
  "Bekasi", "Depok", "Bogor", "Yogyakarta", "Sleman", "Bantul", "Surakarta (Solo)",
  "Malang", "Sidoarjo", "Gresik", "Denpasar", "Badung", "Mataram (Lombok)", "Lombok Barat",
  "Palembang", "Pekanbaru", "Bandar Lampung", "Padang", "Banjarmasin", "Balikpapan",
  "Pontianak", "Samarinda", "Manado", "Batam", "Serang", "Cilegon", "Cirebon",
  "Tasikmalaya", "Sukabumi", "Purwokerto", "Tegal", "Pekalongan", "Kediri", "Jember",
  "Banyuwangi", "Madiun", "Kupang", "Jayapura", "Ambon", "Bengkulu", "Jambi"
];

// Times relative
const minutesOffsets = [
  2, 3, 5, 7, 9, 12, 15, 18, 22, 26, 31, 35, 42, 47, 54,
  62, 75, 88, 105, 120, 140, 165, 190, 220, 260
];

function formatTime(min) {
  if (min < 60) return `${min} menit yang lalu`;
  const h = Math.floor(min / 60);
  return `${h} jam yang lalu`;
}

// Ensure 250 unique items
const sales = [];
const usedThemes = new Set();

// Filter high quality themes
const topThemes = [
  ...themes.filter(t => t.category === 'Tema V.02'),
  ...themes.filter(t => t.category === 'Eksklusif'),
  ...themes.filter(t => t.category === 'Premium'),
  ...themes.filter(t => t.category === 'Adat'),
  ...themes.filter(t => t.category === 'Floral'),
  ...themes.filter(t => t.category === 'Animasi'),
  ...themes.filter(t => t.category === 'Syukuran')
];

let nameIdx = 0;
let cityIdx = 0;
let themeIdx = 0;
let timeIdx = 0;

for (let i = 0; i < 250; i++) {
  const day = Math.floor(i / (250 / 7)); // 0 to 6
  const theme = topThemes[i % topThemes.length];
  
  // Synthesize name if rawNames run out
  let name;
  if (i < rawNames.length) {
    name = rawNames[i];
  } else {
    const groomFirst = ["Raka", "Fatih", "Zulfikar", "Althaf", "Dhafin", "Arka", "Bram", "Reyhan", "Vino", "Farid", "Taufiq", "Fajar", "Haikal", "Erick", "Alden", "Galang", "Rafif", "Daffa", "Zidan", "Rio", "Bima", "Alvin", "Naufal", "Rasyid", "Yusuf", "Akbar", "Irfan", "Lutfi", "Kurnia", "Gibran", "Dion", "Riko", "Rendy", "Bagas", "Sandy", "Randi", "Evan", "Ferdy", "Kevyn", "Mahesa", "Satria", "Fian", "Reno", "Vian", "Aditya", "Rizki", "Zacky", "Fahri", "Danis", "Rivaldi", "Ihsan", "Fauzi", "Lukman", "Tegar", "Chandra", "Panji", "Arya", "Guntur", "Bayu", "Wisnu", "Tito", "Rizky", "Rian", "Dani", "Angga", "Candra", "Gani", "Roni", "Yudi", "Doni", "Sony", "Robby", "Rama", "Dimas", "Budi", "Hendra", "Agung", "Bagus", "Ilham", "Gilang", "Arif", "Wahyu", "Surya", "Pandu", "Danang", "Galih", "Agis", "Wildan", "Hilman", "Fahmi", "Cecep", "Asep", "Deden", "Riki", "Rahmat", "Syahrul", "Tigor", "Daniel", "Marcell", "Hotman", "Andi", "Fadli", "Kahar", "Gede", "Wayan", "Lalu", "Frans", "Marten", "Yohanes", "Dedy", "Rico", "Leo", "Jason", "Nathan", "Darren", "Kenneth", "David", "Michael", "Julian", "Samuel", "Nicholas"];
    const brideFirst = ["Alya", "Aura", "Naura", "Keysha", "Syakira", "Zahira", "Kezia", "Clarissa", "Tiara", "Nabila", "Dinda", "Safira", "Adelia", "Salma", "Fitri", "Celine", "Tasya", "Nadia", "Salsabila", "Fiona", "Karina", "Talitha", "Shafa", "Aurelia", "Siti", "Hana", "Intan", "Mega", "Rani", "Maya", "Dwi", "Lestari", "Novi", "Indah", "Citra", "Dian", "Retno", "Wulan", "Sekar", "Ayu", "Dewi", "Ratna", "Tari", "Sarah", "Syifa", "Melati", "Kirana", "Rina", "Gina", "Santi", "Imas", "Yuliana", "Dea", "Silvi", "Elvi", "Grace", "Christine", "Ester", "Yohana", "Jessica", "Siska", "Linda", "Tenri", "Wardah", "Rahma", "Putu", "Kadek", "Baiq", "Maria", "Natalia", "Theresia", "Helda", "Febby", "Michelle", "Stephanie", "Vanessa", "Evelyn", "Felicia", "Audrey", "Patricia", "Giselle", "Andrea", "Kimberly", "Sherly"];
    
    const g = groomFirst[(i * 3 + 7) % groomFirst.length];
    const b = brideFirst[(i * 5 + 11) % brideFirst.length];
    name = `${g} & ${b}`;
  }

  const city = cities[(i * 7 + 3) % cities.length];
  const min = minutesOffsets[i % minutesOffsets.length] + ((i * 3) % 15);
  const isPhoto = (i % 3 === 0);
  const pkg = isPhoto ? "Paket Dengan Foto" : "Paket Tanpa Foto";

  sales.push({
    id: `GS-ORD-${String(i + 1).padStart(3, '0')}`,
    day: Math.min(day, 6),
    name,
    city,
    themeId: theme.id,
    themeName: theme.name,
    themeCategory: theme.category,
    themeImage: theme.image,
    demo: theme.demo,
    package: pkg,
    price: isPhoto ? theme.photoPrice || 109000 : theme.price || 79000,
    timeAgo: formatTime(min)
  });
}

fs.writeFileSync('public/sales-data.json', JSON.stringify(sales, null, 2));
console.log(`Successfully generated ${sales.length} sales records across 7 days.`);
