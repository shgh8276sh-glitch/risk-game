export interface TerritoryDefinition {
  id: string;
  name: string;
  continentId: string;
  neighbors: string[];
  labelPosition: { x: number; y: number };
}

export const CONTINENTS: Record<string, { id: string; name: string; bonus: number; color: string }> = {
  na: { id: "na", name: "North America", bonus: 5, color: "#d97706" },
  sa: { id: "sa", name: "South America", bonus: 2, color: "#dc2626" },
  eu: { id: "eu", name: "Europe", bonus: 5, color: "#7c3aed" },
  af: { id: "af", name: "Africa", bonus: 3, color: "#b45309" },
  as: { id: "as", name: "Asia", bonus: 7, color: "#16a34a" },
  au: { id: "au", name: "Australia", bonus: 2, color: "#db2777" },
};

// مرزبندی‌ها با نقشه‌ی استاندارد ریسک (۴۲ قلمرو و ۸۳ مرز دوطرفه) بازبینی و اصلاح شده‌اند:
//  • انتاریو ↔ غرب آمریکا (Ontario ↔ Western US) اضافه شد
//  • بریتانیا ↔ اسکاندیناوی اضافه شد
//  • اروپای شمالی ↔ اسکاندیناوی اضافه شد و مرز اشتباه اروپای شمالی ↔ ایسلند حذف شد
//  • خاورمیانه ↔ شرق آفریقا اضافه شد
//  • مغولستان ↔ ژاپن اضافه شد (دیگر نیازی به استثنای دستی در کد نیست)
//  • گینه‌نو ↔ استرالیای غربی اضافه شد
export const TERRITORIES: TerritoryDefinition[] = [
  // آمریکای شمالی (۹)
  { id: "alaska", name: "Alaska", continentId: "na", neighbors: ["northwest_territory", "alberta", "kamchatka"], labelPosition: { x: 67, y: 116 } },
  { id: "northwest_territory", name: "NW Territory", continentId: "na", neighbors: ["alaska", "alberta", "ontario", "greenland"], labelPosition: { x: 154, y: 117 } },
  { id: "greenland", name: "Greenland", continentId: "na", neighbors: ["northwest_territory", "ontario", "quebec", "iceland"], labelPosition: { x: 390, y: 73 } },
  { id: "alberta", name: "Alberta", continentId: "na", neighbors: ["alaska", "northwest_territory", "ontario", "western_us"], labelPosition: { x: 159, y: 157 } },
  { id: "ontario", name: "Ontario", continentId: "na", neighbors: ["northwest_territory", "alberta", "greenland", "quebec", "western_us", "eastern_us"], labelPosition: { x: 239, y: 161 } },
  { id: "quebec", name: "Quebec", continentId: "na", neighbors: ["ontario", "greenland", "eastern_us"], labelPosition: { x: 308, y: 155 } },
  { id: "western_us", name: "Western US", continentId: "na", neighbors: ["alberta", "ontario", "eastern_us", "central_america"], labelPosition: { x: 190, y: 216 } },
  { id: "eastern_us", name: "Eastern US", continentId: "na", neighbors: ["western_us", "ontario", "quebec", "central_america"], labelPosition: { x: 239, y: 233 } },
  { id: "central_america", name: "Central America", continentId: "na", neighbors: ["western_us", "eastern_us", "venezuela"], labelPosition: { x: 191, y: 286 } },

  // آمریکای جنوبی (۴)
  { id: "venezuela", name: "Venezuela", continentId: "sa", neighbors: ["central_america", "peru", "brazil"], labelPosition: { x: 217, y: 353 } },
  { id: "peru", name: "Peru", continentId: "sa", neighbors: ["venezuela", "brazil", "argentina"], labelPosition: { x: 194, y: 401 } },
  { id: "brazil", name: "Brazil", continentId: "sa", neighbors: ["venezuela", "peru", "argentina", "north_africa"], labelPosition: { x: 307, y: 402 } },
  { id: "argentina", name: "Argentina", continentId: "sa", neighbors: ["peru", "brazil"], labelPosition: { x: 240, y: 531 } },

  // اروپا (۷)
  { id: "iceland", name: "Iceland", continentId: "eu", neighbors: ["greenland", "great_britain", "scandinavia"], labelPosition: { x: 424, y: 136 } },
  { id: "scandinavia", name: "Scandinavia", continentId: "eu", neighbors: ["iceland", "great_britain", "northern_europe", "ukraine"], labelPosition: { x: 499, y: 124 } },
  { id: "great_britain", name: "Great Britain", continentId: "eu", neighbors: ["iceland", "scandinavia", "northern_europe", "western_europe"], labelPosition: { x: 428, y: 196 } },
  { id: "northern_europe", name: "N. Europe", continentId: "eu", neighbors: ["great_britain", "scandinavia", "ukraine", "southern_europe", "western_europe"], labelPosition: { x: 475, y: 206 } },
  { id: "western_europe", name: "W. Europe", continentId: "eu", neighbors: ["great_britain", "northern_europe", "southern_europe", "north_africa"], labelPosition: { x: 431, y: 256 } },
  { id: "southern_europe", name: "S. Europe", continentId: "eu", neighbors: ["western_europe", "northern_europe", "ukraine", "middle_east", "egypt", "north_africa"], labelPosition: { x: 494, y: 248 } },
  { id: "ukraine", name: "Ukraine", continentId: "eu", neighbors: ["scandinavia", "northern_europe", "southern_europe", "middle_east", "afghanistan", "ural"], labelPosition: { x: 571, y: 157 } },

  // آفریقا (۶)
  { id: "north_africa", name: "N. Africa", continentId: "af", neighbors: ["brazil", "western_europe", "southern_europe", "egypt", "east_africa", "congo"], labelPosition: { x: 421, y: 333 } },
  { id: "egypt", name: "Egypt", continentId: "af", neighbors: ["north_africa", "southern_europe", "middle_east", "east_africa"], labelPosition: { x: 502, y: 316 } },
  { id: "east_africa", name: "E. Africa", continentId: "af", neighbors: ["egypt", "north_africa", "middle_east", "congo", "south_africa", "madagascar"], labelPosition: { x: 537, y: 386 } },
  { id: "congo", name: "Congo", continentId: "af", neighbors: ["north_africa", "east_africa", "south_africa"], labelPosition: { x: 499, y: 434 } },
  { id: "south_africa", name: "S. Africa", continentId: "af", neighbors: ["congo", "east_africa", "madagascar"], labelPosition: { x: 490, y: 506 } },
  { id: "madagascar", name: "Madagascar", continentId: "af", neighbors: ["east_africa", "south_africa"], labelPosition: { x: 579, y: 510 } },

  // آسیا (۱۲)
  { id: "ural", name: "Ural", continentId: "as", neighbors: ["ukraine", "siberian", "china", "afghanistan"], labelPosition: { x: 665, y: 149 } },
  { id: "siberian", name: "Siberia", continentId: "as", neighbors: ["ural", "yakutsk", "irkutsk", "mongolia", "china"], labelPosition: { x: 725, y: 109 } },
  { id: "yakutsk", name: "Yakutsk", continentId: "as", neighbors: ["siberian", "irkutsk", "kamchatka"], labelPosition: { x: 850, y: 99 } },
  { id: "kamchatka", name: "Kamchatka", continentId: "as", neighbors: ["yakutsk", "irkutsk", "mongolia", "japan", "alaska"], labelPosition: { x: 925, y: 116 } },
  { id: "irkutsk", name: "Irkutsk", continentId: "as", neighbors: ["siberian", "yakutsk", "kamchatka", "mongolia"], labelPosition: { x: 800, y: 170 } },
  { id: "mongolia", name: "Mongolia", continentId: "as", neighbors: ["siberian", "irkutsk", "kamchatka", "china", "japan"], labelPosition: { x: 825, y: 203 } },
  { id: "japan", name: "Japan", continentId: "as", neighbors: ["kamchatka", "mongolia"], labelPosition: { x: 876, y: 258 } },
  { id: "afghanistan", name: "Afghanistan", continentId: "as", neighbors: ["ukraine", "ural", "china", "india", "middle_east"], labelPosition: { x: 646, y: 250 } },
  { id: "china", name: "China", continentId: "as", neighbors: ["ural", "siberian", "mongolia", "india", "siam", "afghanistan"], labelPosition: { x: 740, y: 260 } },
  { id: "india", name: "India", continentId: "as", neighbors: ["middle_east", "afghanistan", "china", "siam"], labelPosition: { x: 669, y: 305 } },
  { id: "siam", name: "Siam", continentId: "as", neighbors: ["india", "china", "indonesia"], labelPosition: { x: 758, y: 328 } },
  { id: "middle_east", name: "Middle East", continentId: "as", neighbors: ["ukraine", "southern_europe", "egypt", "east_africa", "india", "afghanistan"], labelPosition: { x: 572, y: 287 } },

  // استرالیا (۴)
  { id: "indonesia", name: "Indonesia", continentId: "au", neighbors: ["siam", "new_guinea", "western_australia"], labelPosition: { x: 792, y: 403 } },
  { id: "new_guinea", name: "New Guinea", continentId: "au", neighbors: ["indonesia", "eastern_australia", "western_australia"], labelPosition: { x: 890, y: 425 } },
  { id: "western_australia", name: "W. Australia", continentId: "au", neighbors: ["indonesia", "new_guinea", "eastern_australia"], labelPosition: { x: 789, y: 488 } },
  { id: "eastern_australia", name: "E. Australia", continentId: "au", neighbors: ["new_guinea", "western_australia"], labelPosition: { x: 896, y: 511 } },

];
