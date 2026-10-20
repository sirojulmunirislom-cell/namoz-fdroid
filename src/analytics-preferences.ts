import type { UserPreferences } from '../shared/schema';
import { AgeGroup, Gender } from '../shared/analytics';
export function analyticsMetadata(prefs: UserPreferences) {
  if (!prefs.analytics) return {};
  const age = AgeGroup.safeParse(prefs.audienceAgeGroup);
  const gender = Gender.safeParse(prefs.audienceGender);
  return {
    locale: prefs.locale,
    ...(prefs.audienceStatistics && age.success ? {
      demographics: { consent: true as const, ageGroup: age.data, ...(gender.success ? {gender:gender.data} : {}) },
    } : {}),
  };
}
