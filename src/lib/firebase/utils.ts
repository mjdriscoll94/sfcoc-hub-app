import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  getDocs,
  getDoc,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './config';
import { PrayerPraise, Announcement, VolunteerOpportunity } from './models';

interface PrayerPraiseData {
  type: 'prayer' | 'praise';
  title: string;
  description: string;
  author: {
    id: string;
    name: string;
  };
  isAnonymous: boolean;
  isAdminOnly?: boolean;
  status: 'active' | 'archived';
}

interface VolunteerOpportunityData {
  title: string;
  description: string;
  dateTime: Date;
  location: string;
  contactEmail: string;
  contactPhone?: string;
  maxVolunteers: number;
  status: 'open' | 'closed' | 'cancelled';
  createdBy: {
    uid: string;
    displayName: string;
  };
}

// Prayer and Praise Requests
export const addPrayerPraise = async (data: PrayerPraiseData, isAdmin: boolean = false) => {
  try {
    const docData = {
      ...data,
      dateCreated: Timestamp.now(),
      prayerCount: 0,
      approvalStatus: isAdmin ? 'approved' : 'pending'
    };

    const docRef = await addDoc(collection(db, 'prayerPraise'), docData);
    return docRef.id;
  } catch (error) {
    console.error('Error adding prayer/praise:', error);
    throw error;
  }
};

export const updatePrayerPraise = async (id: string, data: Partial<PrayerPraise>) => {
  const docRef = doc(db, 'prayerPraise', id);
  await updateDoc(docRef, data);
};

export const incrementPrayerCount = async (id: string) => {
  const docRef = doc(db, 'prayerPraise', id);
  await updateDoc(docRef, {
    prayerCount: (await getDoc(docRef)).data()?.prayerCount + 1,
  });
};

export const getPrayerPraise = async (type?: 'prayer' | 'praise') => {
  const q = type
    ? query(
        collection(db, 'prayerPraise'),
        where('type', '==', type),
        where('status', '==', 'active'),
        orderBy('dateCreated', 'desc')
      )
    : query(
        collection(db, 'prayerPraise'),
        where('status', '==', 'active'),
        orderBy('dateCreated', 'desc')
      );

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    dateCreated: (doc.data().dateCreated as Timestamp).toDate(),
  })) as PrayerPraise[];
};

// Migration function to update existing prayer requests
export const migrateExistingPrayerRequests = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'prayerPraise'));
    
    const updatePromises = querySnapshot.docs.map(async (docSnapshot) => {
      const data = docSnapshot.data();
      
      // Only update if approvalStatus is not set
      if (!data.approvalStatus) {
        await updateDoc(doc(db, 'prayerPraise', docSnapshot.id), {
          approvalStatus: 'approved' // Set all existing requests to approved
        });
      }
    });

    await Promise.all(updatePromises);
    console.log('Successfully migrated existing prayer requests');
  } catch (error) {
    console.error('Error migrating prayer requests:', error);
    throw error;
  }
};

// Announcements
export const addAnnouncement = async (data: Omit<Announcement, 'id' | 'datePosted'>) => {
  const docRef = await addDoc(collection(db, 'announcements'), {
    ...data,
    datePosted: serverTimestamp(),
  });
  return docRef.id;
};

export const updateAnnouncement = async (id: string, data: Partial<Announcement>) => {
  const docRef = doc(db, 'announcements', id);
  await updateDoc(docRef, data);
};

export const getAnnouncements = async () => {
  const q = query(
    collection(db, 'announcements'),
    where('status', '==', 'active'),
    orderBy('datePosted', 'desc')
  );

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    datePosted: (doc.data().datePosted as Timestamp).toDate(),
    expiryDate: doc.data().expiryDate ? (doc.data().expiryDate as Timestamp).toDate() : undefined,
  })) as Announcement[];
};

// Volunteer Opportunities
export const addVolunteerOpportunity = async (data: VolunteerOpportunityData) => {
  try {
    const docData = {
      ...data,
      dateTime: Timestamp.fromDate(data.dateTime),
      createdAt: Timestamp.now(),
      currentVolunteers: 0,
      volunteers: [] // Array to store volunteer information
    };

    const docRef = await addDoc(collection(db, 'volunteerOpportunities'), docData);
    return docRef.id;
  } catch (error) {
    console.error('Error adding volunteer opportunity:', error);
    throw error;
  }
};

export const updateVolunteerOpportunity = async (id: string, data: Partial<VolunteerOpportunity>) => {
  const docRef = doc(db, 'volunteerOpportunities', id);
  await updateDoc(docRef, data);
};

export const signUpVolunteer = async (opportunityId: string, userId: string, userName: string) => {
  const docRef = doc(db, 'volunteerOpportunities', opportunityId);
  const opportunity = await getDoc(docRef);
  const currentSignUps = opportunity.data()?.signedUpUsers || [];
  
  if (currentSignUps.length >= opportunity.data()?.slots) {
    throw new Error('This opportunity is already full');
  }

  await updateDoc(docRef, {
    signedUpUsers: [...currentSignUps, { id: userId, name: userName }],
    status: currentSignUps.length + 1 >= opportunity.data()?.slots ? 'filled' : 'open',
  });
};

export const getVolunteerOpportunities = async () => {
  const q = query(
    collection(db, 'volunteerOpportunities'),
    where('status', 'in', ['open', 'filled']),
    orderBy('eventDate', 'asc')
  );

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    datePosted: (doc.data().datePosted as Timestamp).toDate(),
    eventDate: (doc.data().eventDate as Timestamp).toDate(),
  })) as VolunteerOpportunity[];
}; 