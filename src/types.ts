export const POSITIONS = [
  "QB",
  "RB",
  "WR",
  "TE",
  "LT",
  "LG",
  "C",
  "RG",
  "RT",
  "EDGE",
  "DL",
  "LB",
  "CB",
  "S",
  "K",
  "P"
] as const;

export type Position = (typeof POSITIONS)[number];

export type Conference = "AFC" | "NFC";
export type Division = "East" | "North" | "South" | "West";
export type SaveMode = "sandbox" | "goals";
export type CareerScenario = "worst" | "neutral" | "contender" | "random";
export type SeasonPhase =
  | "preseason"
  | "regular"
  | "postseason"
  | "contract-decisions"
  | "free-agency"
  | "draft-prep"
  | "draft"
  | "udfa"
  | "rookie-results"
  | "rookie-onboarding"
  | "offseason-complete";
export type GameStatus = "scheduled" | "final";
export type Subdivision = "FBS" | "FCS";
export type ScoutingRegion = "National" | "East" | "South" | "Midwest" | "West";
export type PositionGroup = "QB" | "Skill" | "OL" | "Front Seven" | "Secondary" | "Specialists";
export type SchoolSizeFocus = "Any" | "Large School" | "Small School";
export type ScoutingSide = "Offense" | "Defense" | "Special Teams";
export type ScoutingAssignmentType = "prospect" | "position" | "side" | "region" | "conference";
export type ProspectBoardLens = "balanced" | "upside" | "floor" | "value" | "team" | "consensus" | "progress" | "position";
export type ProspectConcernKey = "medical" | "character" | "workEthic";
export type ProspectConcernRanges = Record<ProspectConcernKey, [number, number]>;
export type SeasonType = "preseason" | "regular" | "postseason";
export type PostseasonRoundId = "wild-card" | "divisional" | "conference" | "super-bowl";
export type CalendarPhase =
  | "league-year"
  | "free-agency"
  | "draft"
  | "rookie-development"
  | "offseason-workouts"
  | "training-camp"
  | "preseason"
  | "regular-season"
  | "postseason"
  | "offseason";
export type CalendarEventType =
  | "deadline"
  | "free-agency"
  | "draft"
  | "roster"
  | "waivers"
  | "practice-squad"
  | "injury-report"
  | "game"
  | "training"
  | "scouting"
  | "postseason";
export type KickoffSlot = "WED" | "THU" | "FRI" | "SAT" | "SUN-EARLY" | "SUN-LATE" | "SNF" | "MNF" | "HOLIDAY" | "TBD";
export type InjuryPracticeStatus = "full" | "limited" | "did-not-practice";
export type InjuryGameStatus = "available" | "questionable" | "doubtful" | "out";

export interface PlayerMakeupProfile {
  version: number;
  medical: number;
  character: number;
  workEthic: number;
}

export interface NewCareerOptions {
  selectedTeamId?: string;
  mode?: SaveMode;
  seed?: string;
  scenario?: CareerScenario;
}

export type AttributeKey =
  | "speed"
  | "strength"
  | "athleticism"
  | "awareness"
  | "passing"
  | "rushing"
  | "receiving"
  | "blocking"
  | "tackling"
  | "coverage"
  | "kicking"
  | "durability"
  | "discipline";

export type Attributes = Record<AttributeKey, number>;
export type RatingVector = number[];
export type RatingRangeVector = Array<[number, number]>;
export type DevelopmentStyle = "Early Bloomer" | "Steady Climber" | "Late Bloomer" | "Boom/Bust";
export type TrainingBodyPlan = "auto" | "maintain" | "lean-bulk" | "power-bulk" | "cut" | "conditioning" | "mobility";
export type TrainingSkillPlan = "auto" | "maintain" | "position-technique" | "athlete" | "passing" | "ball-skills" | "trench" | "coverage" | "pass-rush" | "specialist";
export type SkillBucketKey =
  | "speed"
  | "burst"
  | "power"
  | "stamina"
  | "processing"
  | "discipline"
  | "throwing"
  | "accuracy"
  | "pocket"
  | "ballCarrier"
  | "hands"
  | "routeCraft"
  | "passProtection"
  | "runBlocking"
  | "frontDefense"
  | "tackling"
  | "coverage"
  | "passRush"
  | "specialist";
export type SkillBuckets = Record<SkillBucketKey, number>;

export interface BodyProfile {
  heightInches: number;
  frameSize: number;
  weightLbs: number;
  musclePct: number;
  bodyFatPct: number;
  conditioning: number;
  flexibility: number;
  recovery: number;
  explosiveReadiness: number;
}

export interface TrainingWeekReport {
  seasonYear: number;
  week: number;
  date?: string;
  summary: string;
  bodySummary: string;
  footballSummary: string;
  risk: string;
  readinessDelta: number;
  changedPrimaryPosition?: boolean;
  previousPrimaryPosition?: Position;
  nextPrimaryPosition?: Position;
}

export interface PlayerTrainingState {
  bodyPlan: TrainingBodyPlan;
  skillPlan: TrainingSkillPlan;
  targetPosition?: Position;
  autoPosition: boolean;
  conversionProgress: Partial<Record<Position, number>>;
  lastReport?: TrainingWeekReport;
}

export type ScoutedRange = [number, number];

export interface ProspectBodyScoutingReport {
  heightInches: ScoutedRange;
  weightLbs: ScoutedRange;
  musclePct: ScoutedRange;
  bodyFatPct: ScoutedRange;
  conditioning: ScoutedRange;
  flexibility: ScoutedRange;
  recovery: ScoutedRange;
  explosiveReadiness: ScoutedRange;
}

export interface ProspectConversionScoutingReport {
  targetPosition: Position;
  fit: number;
  summary: string;
}

export interface PlayerDevelopmentProfile {
  workEthic: number;
  learning: number;
  volatility: number;
  peakAge: number;
  declineAge: number;
  style: DevelopmentStyle;
}

export type InjurySeverity = "minor" | "moderate" | "major" | "catastrophic";
export type MedicalStatus = "limited" | "injured" | "careerEnded";

export interface ActiveInjury {
  id: string;
  typeId: string;
  name: string;
  severity: InjurySeverity;
  status: MedicalStatus;
  weeksRemaining: number;
  initialWeeks: number;
  limitedWeeksRemaining: number;
  ovrPenalty: number;
  recurrenceTag: string;
  occurredWeek: number;
  occurredDate?: string;
  description: string;
  permanentOverallDelta: number;
  permanentPotentialDelta: number;
  careerEnding: boolean;
}

export interface MedicalEvent extends ActiveInjury {
  playerId: string;
  teamId: string;
  playerName: string;
  position: Position;
  medical: number;
  source: "game" | "practice" | "setback";
  gameId?: string;
}

export interface MedicalHistoryEntry extends MedicalEvent {
  resolved?: boolean;
}

export interface CareerEndedMedicalRecord {
  id: string;
  playerId: string;
  playerName: string;
  position: Position;
  teamId: string;
  collegeId: string;
  age: number;
  week: number;
  date?: string;
  injuryName: string;
  medical: number;
  overallBefore: number;
  potentialBefore: number;
  permanentOverallDelta: number;
  permanentPotentialDelta: number;
  summary: string;
}

export interface NFLTeam {
  id: string;
  abbreviation: string;
  city: string;
  name: string;
  fullName: string;
  conference: Conference;
  division: Division;
  colors: {
    primary: string;
    secondary: string;
  };
  logoUrl: string;
  marketSize: number;
}

export interface CollegeProgram {
  id: string;
  name: string;
  mascot: string;
  conference: string;
  subdivision: Subdivision;
  logoUrl?: string;
  logoUrls?: string[];
  logoSource: "espn" | "generated" | "local";
  logoInitials: string;
  primaryColor: string;
  secondaryColor: string;
  prestige: number;
  competition: number;
  scheme: "pro" | "spread" | "power" | "air-raid" | "multiple";
  strengths: Position[];
}

export interface PlayerStats {
  games: number;
  snaps: number;
  offenseSnaps: number;
  defenseSnaps: number;
  specialTeamsSnaps: number;
  passYards: number;
  rushYards: number;
  receivingYards: number;
  tackles: number;
  sacks: number;
  interceptions: number;
  touchdowns: number;
}

export interface Player {
  id: string;
  firstName: string;
  lastName: string;
  position: Position;
  positionFits: Partial<Record<Position, number>>;
  teamId: string;
  previousTeamId?: string;
  teamStartSeason?: number;
  draftYear?: number;
  collegeId: string;
  age: number;
  overall: number;
  potential: number;
  body: BodyProfile;
  skillBuckets: SkillBuckets;
  training: PlayerTrainingState;
  ratings: RatingVector;
  attributes: Attributes;
  salary: number;
  contractYears: number;
  contract?: PlayerContract;
  medical: number;
  status: "active" | "practice" | "elevated" | "injured" | "suspended" | "limited";
  practiceSquad?: boolean;
  practiceSquadSignedWeek?: number;
  practiceSquadSignedDate?: string;
  practiceSquadSignedSeason?: number;
  practiceSquadElevations?: number;
  practiceSquadElevatedWeek?: number;
  practiceSquadElevatedDate?: string;
  practiceSquadProtectedWeek?: number;
  practiceSquadProtectedDate?: string;
  practiceSquadOriginalSalary?: number;
  reserveStatus?: "ir";
  irPlacedWeek?: number;
  irPlacedDate?: string;
  irPlacedSeason?: number;
  irEligibleWeek?: number;
  irEligibleDate?: string;
  irReturnDesignatedWeek?: number;
  irReturnDesignatedDate?: string;
  irPracticeWindowDeadlineWeek?: number;
  irPracticeWindowDeadlineDate?: string;
  irGamesMissed?: number;
  irReturnCount?: number;
  injuryWeeks: number;
  injury?: ActiveInjury;
  suspensionWeeks: number;
  makeup: PlayerMakeupProfile;
  traits: string[];
  development: PlayerDevelopmentProfile;
  stats: PlayerStats;
  playoffStats: PlayerStats;
}

export interface FreeAgencyMove {
  id: string;
  type: "signing" | "release" | "offer" | "declined" | "counter" | "ir-replacement";
  seasonYear: number;
  week: number;
  date?: string;
  playerId: string;
  playerName: string;
  position: Position;
  teamId: string;
  salary: number;
  contractYears: number;
  details?: string;
  source?: "user" | "cpu" | "staff";
}

export type FreeAgentOfferStatus = "submitted" | "accepted" | "declined" | "countered" | "withdrawn" | "expired";
export type FreeAgentOfferSource = "user" | "cpu" | "staff";
export type FreeAgentRolePromise = "starter" | "rotation" | "depth" | "development";
export type FreeAgentSecurityLevel = "low" | "standard" | "strong";

export interface FreeAgentOffer {
  id: string;
  seasonYear: number;
  week: number;
  date?: string;
  wave: number;
  playerId: string;
  teamId: string;
  source: FreeAgentOfferSource;
  years: number;
  apy: number;
  security: FreeAgentSecurityLevel;
  role: FreeAgentRolePromise;
  interestScore: number;
  projectedCapHit: number;
  expectedAsk: number;
  status: FreeAgentOfferStatus;
  resolveWeek: number;
  resolveDate?: string;
  resolvedWeek?: number;
  resolvedDate?: string;
  resolutionReason?: string;
  competingTeamIds?: string[];
}

export interface FreeAgencyDecisionLog {
  id: string;
  seasonYear: number;
  week: number;
  date?: string;
  wave: number;
  playerId: string;
  playerName: string;
  position: Position;
  teamId?: string;
  status: FreeAgentOfferStatus;
  apy?: number;
  years?: number;
  summary: string;
}

export interface FreeAgencyMarketState {
  seasonYear: number;
  currentWave: number;
  offers: FreeAgentOffer[];
  decisions: FreeAgencyDecisionLog[];
}

export type RosterMoveRecommendationType =
  | "sign"
  | "release"
  | "place-ir"
  | "designate-ir-return"
  | "activate-ir"
  | "promote-practice"
  | "elevate-practice"
  | "protect-practice"
  | "restructure";

export interface RosterMoveRecommendation {
  id: string;
  type: RosterMoveRecommendationType;
  teamId: string;
  playerId?: string;
  targetPlayerId?: string;
  position?: Position;
  title: string;
  summary: string;
  impact: string;
  required: boolean;
  disabledReason?: string;
}

export type ContractOrigin = "generated" | "free-agent" | "extension" | "rookie" | "udfa" | "practice-squad" | "tag" | "tender";
export type FreeAgentRights = "none" | "ufa" | "rfa" | "erfa";
export type TagType = "franchise" | "transition";
export type TenderLevel = "erfa" | "right-of-first-refusal" | "original-round" | "second-round" | "first-round";

export interface ContractSeason {
  seasonYear: number;
  baseSalary: number;
  signingBonusProration: number;
  guaranteedSalary: number;
}

export interface ContractRestructure {
  seasonYear: number;
  convertedBase: number;
  addedBonus: number;
  annualProration: number;
}

export interface PlayerContract {
  startYear: number;
  endYear: number;
  years: number;
  apy: number;
  signingBonus: number;
  guaranteedTotal: number;
  seasons: ContractSeason[];
  origin: ContractOrigin;
  rights: FreeAgentRights;
  tagType?: TagType;
  tenderLevel?: TenderLevel;
  restructureHistory?: ContractRestructure[];
}

export interface DeadMoneyCharge {
  id: string;
  teamId: string;
  playerId: string;
  playerName: string;
  seasonYear: number;
  amount: number;
  source: "release" | "trade" | "restructure" | "guarantee";
}

export interface TeamCapSettings {
  salaryCap: number;
  rookieReserve: number;
  franchiseTagUsed?: boolean;
  transitionTagUsed?: boolean;
}

export type CompPickLedgerKind = "lost" | "gained";

export interface CompPickLedgerEntry {
  id: string;
  kind: CompPickLedgerKind;
  teamId: string;
  playerId: string;
  playerName: string;
  position: Position;
  originalTeamId: string;
  signingTeamId: string;
  seasonYear: number;
  apy: number;
  contractYears: number;
  value: number;
  roundProjection: number;
  canceledById?: string;
  finalized?: boolean;
}

export interface CompPickProjection {
  id: string;
  teamId: string;
  draftYear: number;
  round: number;
  value: number;
  playerName: string;
  sourceEntryId: string;
  finalized?: boolean;
}

export interface CompPickLedger {
  seasonYear: number;
  entries: CompPickLedgerEntry[];
  projections: CompPickProjection[];
  finalizedDraftYear?: number;
}

export type StaffRole =
  | "Head Coach"
  | "Offensive Coordinator"
  | "Defensive Coordinator"
  | "Special Teams Coordinator"
  | "QB Coach"
  | "RB Coach"
  | "WR Coach"
  | "TE Coach"
  | "OL Coach"
  | "DL Coach"
  | "LB Coach"
  | "DB Coach"
  | "Scout"
  | "Scouting Director"
  | "National Scout"
  | "Regional Scout"
  | "Area Scout East"
  | "Area Scout South"
  | "Area Scout Midwest"
  | "Area Scout West"
  | "Small-School Scout"
  | "Position Scout"
  | "Trainer";

export type StaffDepartment = "Coaching" | "Scouting" | "Health";
export type StaffSlotId =
  | "head-coach"
  | "offensive-coordinator"
  | "defensive-coordinator"
  | "special-teams-coordinator"
  | "qb-coach"
  | "rb-coach"
  | "wr-coach"
  | "te-coach"
  | "ol-coach"
  | "dl-coach"
  | "lb-coach"
  | "db-coach"
  | "scout-1"
  | "scout-2"
  | "scout-3"
  | "scout-4"
  | "scout-5"
  | "scout-6"
  | "scout-7"
  | "trainer";

export interface StaffSlotDefinition {
  id: StaffSlotId;
  department: StaffDepartment;
  role: StaffRole;
  label: string;
  shortLabel: string;
  positionFocus?: Position[];
}

export interface StaffRatings {
  tactics: number;
  scouting: number;
  medical: number;
  negotiation: number;
  leadership: number;
  advice: number;
}

export interface ScoutRatings {
  regions: Record<ScoutingRegion, number>;
  positions: Record<Position, number>;
  conferences: Record<string, number>;
  largeSchool: number;
  smallSchool: number;
  offense: number;
  defense: number;
  specialTeams: number;
}

export interface CoachRatings {
  development: number;
  positionDevelopment: number;
  schemeTeaching: number;
  gamePlanning: number;
  playCalling: number;
  motivation: number;
  discipline: number;
  fatigueManagement: number;
  offense: number;
  defense: number;
  specialTeams: number;
}

export interface HealthRatings {
  prevention: number;
  recovery: number;
  rehab: number;
  staminaManagement: number;
  durabilitySupport: number;
  medicalEvaluation: number;
}

export interface StaffSkillProfile {
  type: StaffDepartment;
  scout?: ScoutRatings;
  coach?: CoachRatings;
  health?: HealthRatings;
}

export interface StaffMember {
  id: string;
  firstName: string;
  lastName: string;
  role: StaffRole;
  slotId: StaffSlotId;
  department: StaffDepartment;
  teamId: string;
  age: number;
  salary: number;
  contractYears: number;
  ratings: StaffRatings;
  skillProfile: StaffSkillProfile;
  development: number;
  roleFit: number;
}

export interface StaffCandidate extends StaffMember {
  marketId: string;
  demandSalary: number;
  demandYears: number;
  interestedTeamIds: string[];
  interviewed: boolean;
  hired: boolean;
  valueScore: number;
}

export interface StaffMarketState {
  weekGenerated: number;
  candidates: StaffCandidate[];
}

export interface Prospect {
  id: string;
  firstName: string;
  lastName: string;
  position: Position;
  positionFits: Partial<Record<Position, number>>;
  schoolId: string;
  classYear: "JR" | "SR" | "RS-SO";
  age: number;
  trueOverall: number;
  potential: number;
  body: BodyProfile;
  skillBuckets: SkillBuckets;
  training: PlayerTrainingState;
  ratings: RatingVector;
  production: number;
  combine: {
    speed: number;
    strength: number;
    agility: number;
    explosion: number;
  };
  traits: string[];
  development: PlayerDevelopmentProfile;
  projectedRound: number;
  region: ScoutingRegion;
  stock: number;
  riskFlags: string[];
  medical: number;
  character: number;
  workEthic: number;
  concernProfileVersion?: number;
  consensusRank: number;
  consensusGrade: number;
  consensusProgress: number;
  teamRank: number;
  teamGrade: number;
  valuePickScore: number;
  valuePickLabel: string;
  concernVisibility: Record<ProspectConcernKey, boolean>;
  concernDetails: Partial<Record<ProspectConcernKey, string>>;
  schemeFit: CollegeProgram["scheme"] | "multiple";
  productionTrend: number;
  favorite: boolean;
  hidden: boolean;
  scoutReports: string[];
  scouted: {
    low: number;
    high: number;
    potentialLow: number;
    potentialHigh: number;
    confidence: number;
    progress: number;
    concerns: ProspectConcernRanges;
    watchedTape: boolean;
    ratingRanges: RatingRangeVector;
    bodyRanges?: ProspectBodyScoutingReport;
    conversionUpside?: ProspectConversionScoutingReport[];
    note: string;
  };
}

export interface ScoutingAssignment {
  id: string;
  scoutId: string;
  type: ScoutingAssignmentType;
  focusId: string;
  locked?: boolean;
  intensity?: number;
  prospectIds: string[];
}

export interface CollegeReport {
  id: string;
  week: number;
  region: ScoutingRegion;
  title: string;
  body: string;
  prospectIds: string[];
}

export interface ScoutingRecapEntry {
  prospectId: string;
  firstName: string;
  lastName: string;
  position: Position;
  schoolId: string;
  teamRankBefore: number;
  teamRankAfter: number;
  consensusRank: number;
  progressBefore: number;
  progressAfter: number;
  overallBefore: [number, number];
  overallAfter: [number, number];
  potentialBefore: [number, number];
  potentialAfter: [number, number];
  valuePickScoreBefore: number;
  valuePickScoreAfter: number;
  valuePickLabelBefore: string;
  valuePickLabelAfter: string;
  concernsBefore: ProspectConcernRanges;
  concernsAfter: ProspectConcernRanges;
  note: string;
}

export interface ScoutingWeeklyRecap {
  id: string;
  week: number;
  risers: ScoutingRecapEntry[];
  fallers: ScoutingRecapEntry[];
}

export interface ScoutingPlan {
  assignments: ScoutingAssignment[];
  reports: CollegeReport[];
  recaps: ScoutingWeeklyRecap[];
  lastProcessedWeek: number;
}

export interface GameLogEntry {
  quarter: number;
  clock: string;
  offenseTeamId: string;
  defenseTeamId: string;
  down: number;
  distance: number;
  yardLine: number;
  type: "run" | "pass" | "kick" | "punt" | "turnover" | "penalty" | "score" | "injury" | "note";
  text: string;
}

export interface GameResult {
  homeScore: number;
  awayScore: number;
  log: GameLogEntry[];
  snapCounts: Record<string, PlayerSnapCount>;
  injuries: MedicalEvent[];
}

export interface Game {
  id: string;
  week: number;
  date?: string;
  kickoffSlot?: KickoffSlot;
  homeTeamId: string;
  awayTeamId: string;
  seasonType?: SeasonType;
  playoffRound?: PostseasonRoundId;
  neutralSite?: boolean;
  playoffConference?: Conference;
  playoffSlot?: string;
  homeSeed?: number;
  awaySeed?: number;
  status: GameStatus;
  homeScore: number;
  awayScore: number;
  log: GameLogEntry[];
  injuries: GameResult["injuries"];
  snapCounts: Record<string, PlayerSnapCount>;
}

export interface PlayerSnapCount {
  playerId: string;
  offense: number;
  defense: number;
  specialTeams: number;
}

export interface InboxItem {
  id: string;
  week: number;
  date?: string;
  category: "staff" | "scouting" | "game" | "injury" | "budget" | "goal" | "draft" | "discipline";
  title: string;
  body: string;
  priority: "low" | "normal" | "high";
  read: boolean;
  important?: boolean;
  blocking?: boolean;
}

export interface TeamRecord {
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
}

export interface PostseasonSeed {
  conference: Conference;
  seed: number;
  teamId: string;
  kind: "division" | "wildcard";
  wins: number;
  losses: number;
  ties: number;
}

export interface PostseasonMatchup {
  id: string;
  round: PostseasonRoundId;
  conference?: Conference;
  homeTeamId: string;
  awayTeamId: string;
  homeSeed: number;
  awaySeed: number;
  gameId: string;
  winnerTeamId?: string;
  loserTeamId?: string;
}

export interface PostseasonRound {
  round: PostseasonRoundId;
  week: number;
  date?: string;
  completed: boolean;
  matchups: PostseasonMatchup[];
  byeTeamIds?: string[];
}

export interface PostseasonState {
  seasonYear: number;
  currentRound: PostseasonRoundId;
  seeds: PostseasonSeed[];
  rounds: PostseasonRound[];
  eliminatedTeamIds: string[];
  championTeamId?: string;
  runnerUpTeamId?: string;
  userTeamResult?: "missed" | "active" | PostseasonRoundId | "champion";
}

export interface FranchiseGoals {
  mode: SaveMode;
  targetWins: number;
  makePlayoffs: boolean;
  budgetDiscipline: number;
  fanApproval: number;
  ownerTrust: number;
}

export interface DraftPick {
  id: string;
  draftYear: number;
  round: number;
  pickInRound: number;
  overallPick: number;
  originalTeamId: string;
  currentTeamId: string;
  usedByProspectId?: string;
  compensatory?: boolean;
  compSource?: "seeded" | "ledger";
  compLabel?: string;
}

export interface DraftSelection {
  pickId: string;
  prospectId: string;
  teamId: string;
  round: number;
  overallPick: number;
  signedPlayerId?: string;
}

export interface DraftTradeAsset {
  type: "pick" | "player";
  id: string;
}

export interface DraftTradeOffer {
  id: string;
  fromTeamId: string;
  toTeamId: string;
  gives: DraftTradeAsset[];
  receives: DraftTradeAsset[];
  incomingValue: number;
  outgoingValue: number;
  verdict: "accept" | "counter" | "decline";
  status: "proposed" | "accepted" | "declined";
  message: string;
  rationale?: string;
  userFacing?: boolean;
  counterOffers?: DraftTradeOffer[];
}

export interface DraftEvent {
  id: string;
  type: "pick" | "trade" | "offer" | "surprise" | "clock" | "pause";
  pickId?: string;
  teamId?: string;
  prospectId?: string;
  offerId?: string;
  title: string;
  message: string;
  interrupt: boolean;
  week: number;
  date?: string;
}

export interface DraftState {
  draftYear: number;
  order: string[];
  currentPickIndex: number;
  history: DraftSelection[];
  tradeOffers: DraftTradeOffer[];
  tradeLog: string[];
  eventLog: DraftEvent[];
  pendingEvent?: DraftEvent;
  clockSeconds: number;
  pickTimeLimit: number;
  simSpeed: 1 | 3 | 10;
  skipCpuTradeNotifications: boolean;
  completed: boolean;
}

export type UdfaOfferStatus = "active" | "countered" | "signed" | "lost" | "declined";

export interface UdfaOffer {
  id: string;
  prospectId: string;
  teamId: string;
  wave: number;
  signingBonus: number;
  guaranteedMoney: number;
  status: UdfaOfferStatus;
  isUserOffer: boolean;
  opportunity: number;
  response?: string;
  counterSigningBonus?: number;
  counterGuaranteedMoney?: number;
}

export interface UdfaSigning {
  id: string;
  prospectId: string;
  playerId: string;
  teamId: string;
  wave: number;
  signingBonus: number;
  guaranteedMoney: number;
}

export interface UdfaWaveRecap {
  wave: number;
  userSignedIds: string[];
  userLostIds: string[];
  counterIds: string[];
  relevantCpuSigningIds: string[];
}

export interface UdfaState {
  draftYear: number;
  wave: number;
  totalWaves: number;
  offerSlots: number;
  teamPools: Record<string, number>;
  offers: UdfaOffer[];
  signings: UdfaSigning[];
  recaps: UdfaWaveRecap[];
  completed: boolean;
}

export interface RookieScoutingSnapshot {
  teamRank: number;
  consensusRank: number;
  progress: number;
  overallRange: [number, number];
  potentialRange: [number, number];
  concerns: ProspectConcernRanges;
  reports: string[];
  note: string;
}

export type RookieAcquisitionSource = "draft" | "udfa";

export interface RookieAcquisitionResult {
  id: string;
  playerId: string;
  prospectId: string;
  teamId: string;
  source: RookieAcquisitionSource;
  costLabel: string;
  overallPick?: number;
  round?: number;
  firstName: string;
  lastName: string;
  position: Position;
  schoolId: string;
  actualOverall: number;
  actualPotential: number;
  userBoardRank: number;
  consensusRank: number;
  acquiringTeamRank: number;
  scouting: RookieScoutingSnapshot;
  bestRookieScore: number;
  valueSpentScore: number;
}

export interface RookieClassResults {
  id: string;
  draftYear: number;
  createdWeek: number;
  createdDate?: string;
  acquisitions: RookieAcquisitionResult[];
}

export interface PlayerDevelopmentReport {
  id: string;
  seasonYear: number;
  week: number;
  date?: string;
  playerId: string;
  teamId: string;
  playerName: string;
  position: Position;
  age: number;
  previousOverall: number;
  newOverall: number;
  previousPotential: number;
  newPotential: number;
  deltaOverall: number;
  deltaPotential: number;
  category: "breakout" | "improved" | "steady" | "decline" | "injury";
  summary: string;
}

export interface GameSave {
  version: number;
  careerId?: string;
  seed: string;
  seasonYear: number;
  previousSeasonRanks?: Record<string, number>;
  selectedTeamId: string;
  mode: SaveMode;
  scenario: CareerScenario;
  currentWeek: number;
  currentDate: string;
  leagueYearStartDate: string;
  calendarPhase: CalendarPhase;
  seasonCalendar: CalendarEvent[];
  phase: SeasonPhase;
  teams: NFLTeam[];
  schools: CollegeProgram[];
  players: Player[];
  staff: StaffMember[];
  prospects: Prospect[];
  schedule: Game[];
  records: Record<string, TeamRecord>;
  inbox: InboxItem[];
  draftPicks: DraftPick[];
  draftState: DraftState;
  udfaState?: UdfaState;
  rookieResults?: RookieClassResults[];
  postseasonState?: PostseasonState;
  scoutingPlan: ScoutingPlan;
  staffMarket: StaffMarketState;
  budget: Record<string, number>;
  capSettings?: Record<string, TeamCapSettings>;
  deadMoney?: DeadMoneyCharge[];
  compPickLedger?: CompPickLedger;
  freeAgencyMarket?: FreeAgencyMarketState;
  goals: FranchiseGoals;
  depthOverrides: Record<string, Partial<Record<Position, string[]>>>;
  freeAgencyLog: FreeAgencyMove[];
  developmentReports: PlayerDevelopmentReport[];
  medicalHistory: MedicalHistoryEntry[];
  careerEndedRecords: CareerEndedMedicalRecord[];
  irReturnUsage: Record<string, number>;
  waiverState?: WaiverState;
  injuryReports?: InjuryReport[];
  lastViewedGameId?: string;
}

export interface CalendarEvent {
  id: string;
  date: string;
  type: CalendarEventType;
  title: string;
  description?: string;
  phase?: CalendarPhase;
  teamId?: string;
  gameId?: string;
  actionTab?: string;
  footballWeek?: number;
  important?: boolean;
}

export type WaiverClaimStatus = "submitted" | "awarded" | "failed" | "expired";

export interface WaiverClaim {
  id: string;
  playerId: string;
  teamId: string;
  date: string;
  status: WaiverClaimStatus;
  reason?: string;
}

export interface WaiverPlayer {
  id: string;
  playerId: string;
  originalTeamId: string;
  waivedDate: string;
  claimDeadlineDate: string;
  salary: number;
  contractYears: number;
  contract?: PlayerContract;
  claims: WaiverClaim[];
  status: "waivers" | "claimed" | "cleared";
}

export interface WaiverState {
  order: string[];
  players: WaiverPlayer[];
  lastProcessedDate?: string;
}

export interface InjuryReportPlayer {
  playerId: string;
  playerName: string;
  position: Position;
  practiceStatus: InjuryPracticeStatus;
  gameStatus: InjuryGameStatus;
  injuryName?: string;
}

export interface InjuryReport {
  id: string;
  teamId: string;
  gameId: string;
  week: number;
  date: string;
  reportDate: string;
  players: InjuryReportPlayer[];
}
