/**
 * Genres de référence de ReZToon.
 *
 * Ces six genres sont les genres "principaux" : ils servent
 *  1. de graine (seed) pour la table `genres` de Supabase,
 *  2. de repli (fallback) si la base est vide ou injoignable.
 *
 * Le supervisor peut ensuite les modifier, en ajouter ou en supprimer depuis
 * /supervisor/genres : toute l'application lit alors la table `genres`
 * (voir core/services/genreService.ts et core/hooks/useGenres.ts).
 */

export interface GenreRecord {
  /** Slug stable (clé primaire). */
  id: string;
  /** Nom affiché ET valeur stockée dans mangas.genre, groups.genre, etc. */
  name: string;
  /** Équivalent japonais / occidental (ex. « Shōnen »). */
  equivalent: string;
  /** Petite étiquette affichée sur la landing page. */
  tag: string;
  /** Description (7 phrases) en français. */
  descriptionFr: string;
  /** Description (7 phrases) en anglais. */
  descriptionEn: string;
  accentColor: string;
  position: number;
  isActive: boolean;
}

export const DEFAULT_GENRES: GenreRecord[] = [
  {
    id: 'mankia',
    name: 'Mankia',
    equivalent: 'Shōnen',
    tag: 'Shōnen',
    accentColor: '#f5b042',
    position: 1,
    isActive: true,
    descriptionFr:
      "Mankia est le shōnen africain : des récits d'action, de dépassement de soi et d'amitié portés par de jeunes héros nés sur le continent. " +
      "Ses protagonistes puisent leur force dans l'héritage de leurs ancêtres, les rites d'initiation, les masques et les totems de leur peuple. " +
      "Les combats mettent en scène des arts martiaux inspirés de traditions réelles, comme la lutte sénégalaise, le Dambe haoussa ou l'Engolo angolais. " +
      "Chaque tournoi, chaque quête et chaque entraînement se déroule dans des décors reconnaissables : savanes, villages d'argile ocre, cités royales et forêts équatoriales. " +
      "Les mentors sont des griots, des forgerons, des anciens ou des reines guerrières qui transmettent la sagesse de la communauté autant que la technique. " +
      "Les valeurs de l'ubuntu, « je suis parce que nous sommes », rappellent que la vraie puissance naît de la solidarité et non de l'individualisme. " +
      "Mankia offre à la jeunesse africaine des héros qui lui ressemblent et célèbre une culture vivante, fière et combative.",
    descriptionEn:
      "Mankia is African shōnen: action-packed stories of self-improvement and friendship carried by young heroes born on the continent. " +
      "Its protagonists draw their strength from the heritage of their ancestors, initiation rites, masks and the totems of their people. " +
      "The fights showcase martial arts inspired by real traditions, such as Senegalese wrestling, Hausa Dambe or Angolan Engolo. " +
      "Every tournament, quest and training arc unfolds in recognisable settings: savannas, ochre clay villages, royal cities and equatorial forests. " +
      "Mentors are griots, blacksmiths, elders or warrior queens who pass on the wisdom of the community as much as technique. " +
      "The values of ubuntu, \"I am because we are\", remind us that true power is born from solidarity rather than individualism. " +
      "Mankia gives African youth heroes who look like them and celebrates a culture that is alive, proud and fearless.",
  },
  {
    id: 'yorman',
    name: 'Yorman',
    equivalent: 'Seinen',
    tag: 'Seinen',
    accentColor: '#60a5fa',
    position: 2,
    isActive: true,
    descriptionFr:
      "Yorman est le seinen africain : des histoires matures, sombres ou profondément humaines, écrites pour un lectorat adulte. " +
      "Elles explorent la vie des grandes métropoles comme Lagos, Kinshasa, Abidjan, Nairobi ou Johannesburg, avec leurs rêves, leurs contrastes et leurs débrouilles. " +
      "Les thèmes abordés sont la corruption, l'exil, la migration, la quête de réussite, la mémoire coloniale, la famille et le poids des traditions. " +
      "Les personnages sont nuancés : ni héros ni monstres, mais des hommes et des femmes qui jonglent entre morale, survie et loyauté. " +
      "Le trait est plus réaliste, les ambiances sont plus sombres et le rythme laisse place à la réflexion et au silence. " +
      "La musique, la langue de la rue, les marchés, les maquis et les quartiers populaires donnent à chaque récit une authenticité immédiate. " +
      "Yorman valorise une Afrique contemporaine, complexe et sans clichés, racontée de l'intérieur.",
    descriptionEn:
      "Yorman is African seinen: mature, dark or deeply human stories written for an adult readership. " +
      "They explore life in big cities like Lagos, Kinshasa, Abidjan, Nairobi or Johannesburg, with their dreams, contrasts and hustle. " +
      "Its themes include corruption, exile, migration, the pursuit of success, colonial memory, family and the weight of tradition. " +
      "Characters are nuanced: neither heroes nor monsters, but men and women balancing morality, survival and loyalty. " +
      "The line work is more realistic, the mood is darker, and the pacing leaves room for reflection and silence. " +
      "Music, street slang, markets, open-air bars and working-class neighbourhoods give every story instant authenticity. " +
      "Yorman celebrates a contemporary Africa that is complex and cliché-free, told from the inside.",
  },
  {
    id: 'lovers',
    name: "Lover's",
    equivalent: 'Love Story',
    tag: 'Love Story',
    accentColor: '#f472b6',
    position: 3,
    isActive: true,
    descriptionFr:
      "Lover's est la romance africaine : des histoires d'amour qui célèbrent les sentiments, la pudeur et la passion à la manière du continent. " +
      "Les rencontres naissent au marché, à l'université, lors d'un mariage, d'une fête de village ou au bord d'un fleuve. " +
      "Les familles, les dots, les traditions et les différences d'ethnie ou de religion ajoutent des obstacles propres à nos sociétés. " +
      "Les héros s'expriment dans plusieurs langues, mêlant français, anglais, pidgin, wolof, lingala, swahili ou yoruba, avec tendresse et humour. " +
      "Les tenues en wax, les bijoux, les plats partagés, la danse et la musique accompagnent chaque scène de séduction. " +
      "Ces récits parlent aussi d'amitié, de deuil, de diaspora et d'amour de soi, pas seulement de la vie de couple. " +
      "Lover's montre que l'amour africain est lumineux, pudique, drôle et profondément enraciné dans sa culture.",
    descriptionEn:
      "Lover's is African romance: love stories that celebrate feelings, modesty and passion the way the continent lives them. " +
      "Characters meet at the market, at university, at a wedding, during a village festival or by a riverbank. " +
      "Families, dowries, traditions and differences of ethnicity or faith add obstacles that are unique to our societies. " +
      "Heroes speak several languages, mixing French, English, pidgin, Wolof, Lingala, Swahili or Yoruba, with tenderness and humour. " +
      "Wax outfits, jewellery, shared meals, dance and music accompany every moment of courtship. " +
      "These stories also deal with friendship, grief, the diaspora and self-love, not only with couples. " +
      "Lover's shows that African love is radiant, discreet, funny and deeply rooted in its culture.",
  },
  {
    id: 'mountete',
    name: 'Mountété',
    equivalent: 'Isekai',
    tag: 'Isekai',
    accentColor: '#a78bfa',
    position: 4,
    isActive: true,
    descriptionFr:
      "Mountété est l'isekai africain : un personnage ordinaire est transporté dans un autre monde, nourri par les cosmogonies africaines. " +
      "Le passage s'effectue par un baobab sacré, un fleuve, un masque, un rêve d'ancêtre ou un rituel oublié. " +
      "Le héros arrive dans des royaumes mythiques où règnent des esprits, des génies de l'eau, des animaux qui parlent et des divinités inspirées des panthéons yoruba ou akan. " +
      "Il doit apprendre les codes de ce monde, respecter les anciens et gagner la confiance des communautés avant de recevoir un pouvoir. " +
      "Les systèmes de magie s'inspirent des proverbes, des tambours parlants, des plantes médicinales et des danses de transe. " +
      "Le voyage devient un retour à soi, une réconciliation avec ses origines et la découverte de ce que l'on doit à ses ancêtres. " +
      "Mountété ouvre une porte vers un imaginaire africain sans limites, où le fantastique relie le monde visible et le monde invisible.",
    descriptionEn:
      "Mountété is African isekai: an ordinary character is carried into another world shaped by African cosmologies. " +
      "The crossing happens through a sacred baobab, a river, a mask, an ancestor's dream or a forgotten ritual. " +
      "The hero arrives in mythical kingdoms ruled by spirits, water genies, talking animals and deities inspired by the Yoruba or Akan pantheons. " +
      "They must learn the codes of this world, respect the elders and earn the trust of communities before receiving any power. " +
      "Magic systems draw on proverbs, talking drums, medicinal plants and trance dances. " +
      "The journey becomes a return to oneself, a reconciliation with one's origins and the discovery of what we owe to our ancestors. " +
      "Mountété opens a door to a limitless African imagination, where fantasy links the visible and the invisible worlds.",
  },
  {
    id: 'mandrea',
    name: 'Mandrea',
    equivalent: 'Shōjo',
    tag: 'Shōjo',
    accentColor: '#fb7185',
    position: 5,
    isActive: true,
    descriptionFr:
      "Mandrea est le shōjo africain : des récits tendres, émotionnels et élégants centrés sur l'intériorité et la croissance de jeunes héroïnes. " +
      "Les personnages explorent l'amitié, les rêves, les premiers amours, la confiance en soi et la place des femmes dans la société. " +
      "L'esthétique est délicate et colorée, avec des motifs wax, des coiffures tressées, des perles et des fleurs locales qui ornent les cases. " +
      "Les héroïnes sont étudiantes, danseuses, couturières, musiciennes, apprenties griottes ou futures cheffes de leur communauté. " +
      "Les liens mère-fille, les sœurs de cœur, les tantes et les grands-mères jouent un rôle central dans la transmission. " +
      "Le récit célèbre la sensibilité, la sororité et la force douce, qui est aussi une forme de courage. " +
      "Mandrea valorise la beauté et la richesse de la culture africaine vues à travers le regard des femmes.",
    descriptionEn:
      "Mandrea is African shōjo: tender, emotional and elegant stories centred on the inner world and growth of young heroines. " +
      "Characters explore friendship, dreams, first loves, self-confidence and the place of women in society. " +
      "The aesthetic is delicate and colourful, with wax prints, braided hairstyles, beads and local flowers decorating the panels. " +
      "Heroines are students, dancers, seamstresses, musicians, apprentice griottes or future leaders of their community. " +
      "Mother-daughter bonds, sisters of the heart, aunts and grandmothers play a central role in passing things down. " +
      "The story celebrates sensitivity, sisterhood and gentle strength, which is also a form of courage. " +
      "Mandrea honours the beauty and richness of African culture as seen through the eyes of women.",
  },
  {
    id: 'contes',
    name: 'Contes',
    equivalent: 'Contes, Récits et Légendes',
    tag: 'Tales & Legends',
    accentColor: '#4ade80',
    position: 6,
    isActive: true,
    descriptionFr:
      "Contes rassemble les contes, les récits et les légendes de la tradition orale africaine, adaptés en manga. " +
      "On y retrouve Anansi l'araignée, le lièvre rusé, la hyène gourmande, la tortue sage et d'autres figures de nos veillées. " +
      "Chaque histoire se termine par une leçon de vie sur le courage, l'humilité, le partage, le respect ou la justice. " +
      "Les légendes de fondation, d'empires, de rois et de reines comme Soundiata, Sarraounia ou Amina inspirent de grandes épopées dessinées. " +
      "Le récit garde la voix du conteur, avec ses proverbes, ses chants, ses appels au public et ses répétitions rythmées. " +
      "Les griots, les grands-mères et les anciens, gardiens de la mémoire, deviennent des personnages à part entière. " +
      "Contes préserve le patrimoine oral africain et le transmet aux nouvelles générations dans un format moderne.",
    descriptionEn:
      "Contes gathers the tales, stories and legends of African oral tradition, adapted into manga. " +
      "You will meet Anansi the spider, the cunning hare, the greedy hyena, the wise tortoise and other figures from our evening gatherings. " +
      "Every story ends with a life lesson about courage, humility, sharing, respect or justice. " +
      "Founding legends, empires, kings and queens such as Sundiata, Sarraounia or Amina inspire great illustrated epics. " +
      "The narrative keeps the voice of the storyteller, with its proverbs, songs, calls to the audience and rhythmic repetitions. " +
      "Griots, grandmothers and elders, the keepers of memory, become characters in their own right. " +
      "Contes preserves African oral heritage and hands it down to new generations in a modern format.",
  },
];

/** Noms des genres par défaut (repli statique, utilisable hors composant React). */
export const MANGA_GENRES: readonly string[] = DEFAULT_GENRES.map((g) => g.name);

export type MangaGenre = string;

/** Slug stable à partir d'un nom de genre. */
export function slugifyGenre(name: string): string {
  return (name ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function normalizeGenre(input: string, known: readonly string[] = MANGA_GENRES): string {
  const trimmed = (input ?? '').trim();
  if (!trimmed) return trimmed;
  const lower = trimmed.toLowerCase();
  const canonical = known.find((g) => g.toLowerCase() === lower);
  return canonical ?? trimmed;
}
