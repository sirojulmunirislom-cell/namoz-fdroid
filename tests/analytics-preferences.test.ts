import {it,expect} from 'vitest';
import {UserPreferences} from '../shared/schema';
import {analyticsMetadata} from '../src/analytics-preferences';
it('never extends old analytics consent to personal demographic answers',()=>{
 const old=UserPreferences.parse({analytics:true,locale:'ru'});
 expect(old.audienceStatistics).toBe(false);
 expect(analyticsMetadata(old)).toEqual({locale:'ru'});
 expect(analyticsMetadata(UserPreferences.parse({...old,audienceAgeGroup:'35-44',audienceGender:'male'}))).toEqual({locale:'ru'});
});
it('requires both opt-ins and an explicitly selected adult bracket',()=>{
 const prefs=UserPreferences.parse({analytics:true,audienceStatistics:true,audienceAgeGroup:'35-44',audienceGender:'male'});
 expect(analyticsMetadata(prefs)).toEqual({locale:'uz-Latn',demographics:{consent:true,ageGroup:'35-44',gender:'male'}});
 expect(analyticsMetadata({...prefs,analytics:false})).toEqual({});
 expect(analyticsMetadata({...prefs,audienceStatistics:false})).toEqual({locale:'uz-Latn'});
 expect(analyticsMetadata({...prefs,audienceAgeGroup:''})).toEqual({locale:'uz-Latn'});
 expect(analyticsMetadata({...prefs,audienceAgeGroup:'under18'})).toEqual({locale:'uz-Latn'});
 expect(analyticsMetadata({...prefs,audienceGender:''})).toEqual({locale:'uz-Latn',demographics:{consent:true,ageGroup:'35-44'}});
});
