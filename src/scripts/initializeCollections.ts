const { initializeApp, getApp } = require('firebase/app');
const { getFirestore, collection, addDoc, Timestamp } = require('firebase/firestore');

// Initialize Firebase if not already initialized
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

let app;
try {
  app = getApp();
} catch {
  app = initializeApp(firebaseConfig);
}

const db = getFirestore(app);

const initializeCollections = async () => {
  try {
    // Sample prayer requests
    const prayerPraiseCollection = collection(db, 'prayerPraise');
    await addDoc(prayerPraiseCollection, {
      type: 'prayer',
      title: 'Prayer for Church Growth',
      description: 'Please pray for our church\'s spiritual and numerical growth in the coming months.',
      author: {
        id: 'sample-user-1',
        name: 'John Smith'
      },
      dateCreated: Timestamp.now(),
      prayerCount: 0,
      isAnonymous: false,
      status: 'active'
    });

    await addDoc(prayerPraiseCollection, {
      type: 'praise',
      title: 'Successful Youth Event',
      description: 'Praising God for the wonderful turnout at our recent youth gathering!',
      author: {
        id: 'sample-user-2',
        name: 'Mary Johnson'
      },
      dateCreated: Timestamp.now(),
      prayerCount: 0,
      isAnonymous: false,
      status: 'active'
    });

    // Sample announcements
    const announcementsCollection = collection(db, 'announcements');
    await addDoc(announcementsCollection, {
      title: 'Sunday Service Time Change',
      content: 'Starting next month, our Sunday service will begin at 10:00 AM instead of 9:30 AM.',
      author: {
        id: 'admin-1',
        name: 'Pastor David'
      },
      datePosted: Timestamp.now(),
      expiryDate: Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)), // 30 days from now
      priority: 'high',
      status: 'active'
    });

    // Sample volunteer opportunities
    const volunteerCollection = collection(db, 'volunteerOpportunities');
    await addDoc(volunteerCollection, {
      title: 'Sunday School Teachers Needed',
      description: 'We are looking for volunteers to teach Sunday School for ages 5-7.',
      datePosted: Timestamp.now(),
      eventDate: Timestamp.fromDate(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)), // 14 days from now
      location: 'Children\'s Ministry Room',
      slots: 3,
      signedUpUsers: [],
      requirements: [
        'Experience with children',
        'Must be a church member',
        'Available every Sunday morning'
      ],
      status: 'open'
    });

    console.log('Successfully initialized collections with sample data!');
  } catch (error) {
    console.error('Error initializing collections:', error);
  }
};

// Execute the initialization
initializeCollections(); 