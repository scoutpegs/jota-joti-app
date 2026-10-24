/* Public configuration only. Never place passwords, token secrets or private iCal URLs here. */
window.BOULDER_CONFIG = Object.freeze({
  name: 'Boulder Scout Group',
  email: 'gl.boulder@scoutswa.com.au',
  addr: '10 Hamilton Street South, Boulder WA 6432',
  hall: 'Boulder Scout Hall',
  phone: '',
  fb: 'https://www.facebook.com/BoulderScoutGroup/',
  ig: 'https://www.instagram.com/boulderscoutgroup/',
  venturerIg: 'https://www.instagram.com/boulder_venturers/',
  yt: '',
  websiteUrl: 'https://boulderscouts.com',
  timezone: 'Australia/Perth',
  /* Configured Apps Script Web App URL ending in /exec for the calendar. Update if the deployment URL changes. */
  calendarScriptUrl: 'https://script.google.com/macros/s/AKfycbyf-GZ3DBrVcQuQKbTCsax-OvtVnLcIypRaSJZFCy_8_dfygvrLV3W5sb1-bm_GQ9ia/exec',
  /* Optional: Cloudflare Worker origin for photos, news, submissions and admin. Not required for calendar display when Apps Script is configured. */
  apiBase: '',
  /* Turnstile site key is public. It may remain blank until configured. */
  turnstileSiteKey: '',
  /* Group events come from Apps Script or the optional Worker. State events come only from the imported Scouts WA Google Calendar in Apps Script; the public iCalendar endpoint returned HTTP 403 and is not requested. */
  ics: '',
  feed: '',
  calUrl: '',
  waLogo: 'scouts-wa-logo.png', // Official white Scouts WA logo (cropped from PNG_WA_H_White_CMYK.png) for the dark footer.
  /* Local, approved group photos also work without a Cloudflare API. Add root-level files and list them below.
     Example: { url: 'group-camp-01.jpg', alt: 'Boulder Scouts at camp', caption: 'Group camp', section: 'all' }
     `section` may be all, joeys, cubs, scouts or venturers. Photos tagged all appear on every section page. */
  photos: [
    /* Optional manually configured local photos. Approved Cloudflare photos are added from apiBase when connected. */
  ],
  /* Named photo slots are intentional. Add an approved image using the exact path shown in a slot and it fills automatically.
     The source URLs are research leads only: only publish images Boulder Scout Group owns or has permission to reuse. */
  photoSlots: {
    homeHero: [
      { title: 'Outdoor adventure', file: 'home-hero-adventure.jpg', alt: 'Boulder Scouts taking part in an outdoor adventure', note: 'Use a wide landscape photo with space around the group.', sourceUrl: 'https://www.instagram.com/boulderscoutgroup/' },
      { title: 'Camp life', file: 'home-hero-camp.jpg', alt: 'Boulder Scouts camping together', note: 'Choose an approved group camp photo.', sourceUrl: 'https://www.instagram.com/boulderscoutgroup/' }
    ],
    homeAlbum: [
      { title: 'Around the hall', file: 'home-gallery-hall.jpg', alt: 'Activities at Boulder Scout Hall', note: 'An activity inside or around the hall.', sourceUrl: 'https://www.kalminer.com.au/news/kalgoorlie-miner/boulder-scout-group-celebrates-much-anticipated-reopening-of-historic-hall-c-15108907' },
      { title: 'Learning outdoor skills', file: 'home-gallery-skills.jpg', alt: 'Scouts practising an outdoor skill', note: 'A practical activity or skills-night photo.', sourceUrl: 'https://www.instagram.com/boulderscoutgroup/' },
      { title: 'Camping together', file: 'home-gallery-camping.jpg', alt: 'Boulder Scouts on camp', note: 'An approved camp or tent photo.', sourceUrl: 'https://www.instagram.com/boulderscoutgroup/' },
      { title: 'Community service', file: 'home-gallery-community.jpg', alt: 'Boulder Scouts helping the local community', note: 'A project, working bee or service activity.', sourceUrl: 'https://www.kalminer.com.au/news/kalgoorlie-miner/boulder-cub-scouts-tidy-up-kalgoorlie-arboretum-ng-b881403679z' },
      { title: 'Friends and teamwork', file: 'home-gallery-teamwork.jpg', alt: 'Scouts working as a team', note: 'A group activity with permission for publication.', sourceUrl: 'https://www.instagram.com/boulderscoutgroup/' },
      { title: 'Camp cooking', file: 'home-gallery-cooking.jpg', alt: 'Scouts preparing food together on camp', note: 'A supervised camp cooking activity.', sourceUrl: 'https://www.instagram.com/boulderscoutgroup/' },
      { title: 'Walking the Goldfields', file: 'home-gallery-hiking.jpg', alt: 'Boulder Scouts walking outdoors', note: 'A local hike or outdoor walk.', sourceUrl: 'https://www.instagram.com/boulderscoutgroup/' },
      { title: 'Pioneering and building', file: 'home-gallery-pioneering.jpg', alt: 'Scouts building something together', note: 'A pioneering, knots or construction activity.', sourceUrl: 'https://www.instagram.com/boulderscoutgroup/' },
      { title: 'Radio and communication', file: 'home-gallery-radio.jpg', alt: 'Scouts learning communication skills', note: 'A radio, JOTA-JOTI or communication activity.', sourceUrl: 'https://www.instagram.com/boulderscoutgroup/' },
      { title: 'Learning first aid', file: 'home-gallery-first-aid.jpg', alt: 'Scouts practising first aid skills', note: 'A supervised first-aid learning activity.', sourceUrl: 'https://www.instagram.com/boulderscoutgroup/' }
    ],
    sectionHero: {
      joeys: [{ title: 'Joey Scouts', file: 'joeys-hero.jpg', alt: 'Boulder Joey Scouts at an activity', note: 'An approved Joey Scouts group photo.', sourceUrl: 'https://scouts.com.au/join/joeys/' }],
      cubs: [{ title: 'Cub Scouts', file: 'cubs-hero.jpg', alt: 'Boulder Cub Scouts at an activity', note: 'An approved Cub Scouts group photo.', sourceUrl: 'https://scouts.com.au/join/cubs/' }],
      scouts: [{ title: 'Scouts', file: 'scouts-hero.jpg', alt: 'Boulder Scouts taking part in an activity', note: 'An approved Scouts group photo.', sourceUrl: 'https://scouts.com.au/join/scouts/' }],
      venturers: [{ title: 'Venturer Scouts', file: 'venturers-hero.jpg', alt: 'Boulder Venturers taking part in an activity', note: 'An approved Venturer Scouts group photo.', sourceUrl: 'https://www.instagram.com/boulder_venturers/' }]
    },
    sectionAlbum: {
      joeys: [
        { title: 'Play and discover', file: 'joeys-play-discover.jpg', alt: 'Joey Scouts playing and learning', note: 'A safe, fun Joey activity.', sourceUrl: 'https://scouts.com.au/join/joeys/' },
        { title: 'Outdoor explorers', file: 'joeys-outdoors.jpg', alt: 'Joey Scouts exploring outdoors', note: 'An outdoor activity photo.', sourceUrl: 'https://www.instagram.com/boulderscoutgroup/' },
        { title: 'Teamwork', file: 'joeys-teamwork.jpg', alt: 'Joey Scouts working together', note: 'A team activity with photo permission.', sourceUrl: 'https://www.instagram.com/boulderscoutgroup/' },
        { title: 'Nature hunt', file: 'joeys-nature-hunt.jpg', alt: 'Joey Scouts looking closely at nature', note: 'A nature walk or discovery activity.', sourceUrl: 'https://scouts.com.au/join/joeys/' },
        { title: 'Craft time', file: 'joeys-craft.jpg', alt: 'Joey Scouts making a craft', note: 'A hands-on craft activity.', sourceUrl: 'https://www.instagram.com/boulderscoutgroup/' },
        { title: 'Team games', file: 'joeys-team-games.jpg', alt: 'Joey Scouts playing a team game', note: 'An inclusive game or group challenge.', sourceUrl: 'https://scouts.com.au/join/joeys/' },
        { title: 'Family activity', file: 'joeys-family-activity.jpg', alt: 'Joey Scouts at an approved family activity', note: 'A group-approved activity with families.', sourceUrl: 'https://www.instagram.com/boulderscoutgroup/' },
        { title: 'New skills', file: 'joeys-learning-skills.jpg', alt: 'Joey Scouts learning a new skill', note: 'An activity that shows curiosity and learning.', sourceUrl: 'https://scouts.com.au/join/joeys/' },
        { title: 'Outdoor play', file: 'joeys-outdoor-play.jpg', alt: 'Joey Scouts playing outdoors', note: 'A supervised outdoor game.', sourceUrl: 'https://www.instagram.com/boulderscoutgroup/' },
        { title: 'Badge work', file: 'joeys-badge-work.jpg', alt: 'Joey Scouts working towards a badge', note: 'A badge activity or completed project.', sourceUrl: 'https://scouts.com.au/join/joeys/' }
      ],
      cubs: [
        { title: 'Cub adventure', file: 'cubs-adventure.jpg', alt: 'Cub Scouts on an adventure', note: 'An activity, hike or camp photo.', sourceUrl: 'https://scouts.com.au/join/cubs/' },
        { title: 'Make and learn', file: 'cubs-making.jpg', alt: 'Cub Scouts making or building something', note: 'A hands-on activity photo.', sourceUrl: 'https://www.instagram.com/boulderscoutgroup/' },
        { title: 'Helping out', file: 'cubs-service.jpg', alt: 'Cub Scouts helping their community', note: 'A service project photo.', sourceUrl: 'https://www.kalminer.com.au/news/kalgoorlie-miner/boulder-cub-scouts-tidy-up-kalgoorlie-arboretum-ng-b881403679z' },
        { title: 'Cub camp', file: 'cubs-camp.jpg', alt: 'Cub Scouts at camp', note: 'A group-owned camp photo.', sourceUrl: 'https://www.instagram.com/boulderscoutgroup/' },
        { title: 'Hiking together', file: 'cubs-hiking.jpg', alt: 'Cub Scouts on a hike', note: 'A hike or nature trail.', sourceUrl: 'https://scouts.com.au/join/cubs/' },
        { title: 'Pioneering skills', file: 'cubs-pioneering.jpg', alt: 'Cub Scouts learning pioneering skills', note: 'Knots, rope work or safe construction.', sourceUrl: 'https://www.instagram.com/boulderscoutgroup/' },
        { title: 'Cooking outdoors', file: 'cubs-cooking.jpg', alt: 'Cub Scouts preparing food outdoors', note: 'A supervised cooking activity.', sourceUrl: 'https://www.instagram.com/boulderscoutgroup/' },
        { title: 'Games and challenges', file: 'cubs-games.jpg', alt: 'Cub Scouts taking part in a game', note: 'A game or team challenge.', sourceUrl: 'https://scouts.com.au/join/cubs/' },
        { title: 'Creative projects', file: 'cubs-projects.jpg', alt: 'Cub Scouts completing a creative project', note: 'A project made by the Cub Scouts.', sourceUrl: 'https://www.instagram.com/boulderscoutgroup/' },
        { title: 'Community discovery', file: 'cubs-community.jpg', alt: 'Cub Scouts learning about their community', note: 'A community visit or local service activity.', sourceUrl: 'https://www.instagram.com/boulderscoutgroup/' }
      ],
      scouts: [
        { title: 'Outdoor skills', file: 'scouts-outdoor-skills.jpg', alt: 'Scouts practising outdoor skills', note: 'A practical or adventurous activity.', sourceUrl: 'https://scouts.com.au/what-we-do/' },
        { title: 'Camp life', file: 'scouts-camp.jpg', alt: 'Scouts at a camp', note: 'A camp or expedition photo.', sourceUrl: 'https://www.instagram.com/boulderscoutgroup/' },
        { title: 'Challenge and teamwork', file: 'scouts-teamwork.jpg', alt: 'Scouts completing a team challenge', note: 'A team challenge or project.', sourceUrl: 'https://www.instagram.com/boulderscoutgroup/' },
        { title: 'Navigation', file: 'scouts-navigation.jpg', alt: 'Scouts learning navigation', note: 'Map reading, compass work or route planning.', sourceUrl: 'https://scouts.com.au/what-we-do/' },
        { title: 'Hike and explore', file: 'scouts-hiking.jpg', alt: 'Scouts hiking outdoors', note: 'A hike, expedition or nature trail.', sourceUrl: 'https://www.instagram.com/boulderscoutgroup/' },
        { title: 'Camp cooking', file: 'scouts-cooking.jpg', alt: 'Scouts cooking at camp', note: 'A supervised camp cooking activity.', sourceUrl: 'https://www.instagram.com/boulderscoutgroup/' },
        { title: 'Radio skills', file: 'scouts-radio.jpg', alt: 'Scouts learning radio communication', note: 'Radio, JOTA-JOTI or communications.', sourceUrl: 'https://www.instagram.com/boulderscoutgroup/' },
        { title: 'Pioneering', file: 'scouts-pioneering.jpg', alt: 'Scouts working on a pioneering structure', note: 'A safe pioneering or knots project.', sourceUrl: 'https://www.instagram.com/boulderscoutgroup/' },
        { title: 'Around the campfire', file: 'scouts-campfire.jpg', alt: 'Scouts gathered around a supervised campfire', note: 'A campfire or camp evening where photo permissions allow.', sourceUrl: 'https://www.instagram.com/boulderscoutgroup/' },
        { title: 'Service and skills', file: 'scouts-service.jpg', alt: 'Scouts helping with a service project', note: 'A practical community project.', sourceUrl: 'https://www.instagram.com/boulderscoutgroup/' }
      ],
      venturers: [
        { title: 'Expedition and outdoors', file: 'venturers-expedition.jpg', alt: 'Venturers on an outdoor expedition', note: 'An approved hike, camp or expedition photo.', sourceUrl: 'https://www.instagram.com/boulder_venturers/' },
        { title: 'Youth-led projects', file: 'venturers-project.jpg', alt: 'Venturers planning or completing a project', note: 'Show Venturers planning or leading their program.', sourceUrl: 'https://www.instagram.com/boulder_venturers/' },
        { title: 'Community and mates', file: 'venturers-community.jpg', alt: 'Venturers working together', note: 'A service activity or group project.', sourceUrl: 'https://www.instagram.com/boulder_venturers/' },
        { title: 'Venturer camp', file: 'venturers-camp.jpg', alt: 'Venturers at camp', note: 'An approved camp photo.', sourceUrl: 'https://www.instagram.com/boulder_venturers/' },
        { title: 'Hike and expedition', file: 'venturers-hiking.jpg', alt: 'Venturers hiking on an expedition', note: 'An outdoor challenge or hike.', sourceUrl: 'https://www.instagram.com/boulder_venturers/' },
        { title: 'Youth leadership', file: 'venturers-leadership.jpg', alt: 'Venturers leading an activity', note: 'A planning, leadership or mentoring activity.', sourceUrl: 'https://www.instagram.com/boulder_venturers/' },
        { title: 'Cooking and camp skills', file: 'venturers-cooking.jpg', alt: 'Venturers preparing a camp meal', note: 'A supervised camp cooking activity.', sourceUrl: 'https://www.instagram.com/boulder_venturers/' },
        { title: 'Technology and radio', file: 'venturers-technology.jpg', alt: 'Venturers using technology during an activity', note: 'Technology, radio or JOTA-JOTI.', sourceUrl: 'https://www.instagram.com/boulder_venturers/' },
        { title: 'Community project', file: 'venturers-community-project.jpg', alt: 'Venturers completing a community project', note: 'A project that serves the local community.', sourceUrl: 'https://www.instagram.com/boulder_venturers/' },
        { title: 'Water activity', file: 'venturers-water-activity.jpg', alt: 'Venturers taking part in a supervised water activity', note: 'A water activity with appropriate safety and photo permissions.', sourceUrl: 'https://www.instagram.com/boulder_venturers/' }
      ]
    },
  },
  /* Hero media. All files in this flat GitHub Pages project live beside index.html; add the named files directly to the repository root.
     Images can be .jpg, .jpeg, .png, .webp or .avif. For a video, change that one path to .mp4, .webm or .ogv.
     A video should be muted/looping, landscape, short, compressed, and have a poster image for reduced-motion/data-saving users. */
  coverMedia: { home: 'header-home.png', joeys: 'header-joeys.png', cubs: 'header-cubs.png', scouts: 'header-scouts.png', venturers: 'header-venturers.png' },
  coverPosters: { home: '', joeys: '', cubs: '', scouts: '', venturers: '' },
  /* Optional: local hero/banner images. Drop files in the repository root and set the path, e.g. 'home-cover.jpg'.
     Photos are automatically darkened so white Scout logos and heading text stay readable.
     API-managed cover images take priority when a cover is set in the organiser centre. */
  coverPhotos: { home: '', joeys: '', cubs: '', scouts: '', venturers: '' },
  history: '',
  fee: 'Ask us for the current group fee.',
  /* Known regular meeting information; use the live calendar to derive other sections when not specified here. */
  meetingTimes: { venturers: 'Wednesdays, 6–8pm' },
  calendars: {
    whole: { name: 'Whole group', id: '147c938779b4fe249b19a47abc53e2f2070b7f536f50bfdc0fbabda1276a2246@group.calendar.google.com', color: '#800000' },
    joeys: { name: 'Joey Scouts', id: '6c5ec6e03d3c8f4d56be43a2980ae482627b20192f7fb3a0d98670c32d1ef214@group.calendar.google.com', color: '#E37E00' },
    cubs: { name: 'Cub Scouts', id: '0cee13b6cf55915f7e1ce6adcf7f610ce4d1aab4f8de645dff509031ee000300@group.calendar.google.com', color: '#D9A300' },
    scouts: { name: 'Scouts', id: '2d01af5880a708dc71f84202fdf26ba4beaa54733973d15a529105a3c2edc2bc@group.calendar.google.com', color: '#00843D' },
    venturers: { name: 'Venturer Scouts', id: '22b8edad6e49ee7b5a0c16cf6e99f95bec387d8ae31939e5040d862a884f0b5e@group.calendar.google.com', color: '#A6192E' }
  }
});
