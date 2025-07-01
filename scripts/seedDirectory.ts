import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';

dotenv.config();

// Initialize Firebase Admin
const serviceAccount = {
  "type": "service_account",
  "project_id": process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  "private_key_id": process.env.FIREBASE_PRIVATE_KEY_ID,
  "private_key": process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  "client_email": process.env.FIREBASE_CLIENT_EMAIL,
  "client_id": process.env.FIREBASE_CLIENT_ID,
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": process.env.FIREBASE_CLIENT_X509_CERT_URL
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount as admin.ServiceAccount)
});

const db = getFirestore();

const sampleMembers = [
  {
    firstName: "John",
    lastName: "Smith",
    email: "john.smith@example.com",
    phoneNumber: "(555) 123-4567",
    address: "123 Main St, Springfield, IL 62701",
    familyMembers: [
      {
        firstName: "Sarah",
        lastName: "Smith",
        relationship: "Wife"
      },
      {
        firstName: "Emma",
        lastName: "Smith",
        relationship: "Daughter"
      }
    ]
  },
  {
    firstName: "Michael",
    lastName: "Johnson",
    email: "mjohnson@example.com",
    phoneNumber: "(555) 234-5678",
    address: "456 Oak Ave, Springfield, IL 62702",
    photoURL: "https://ui-avatars.com/api/?name=Michael+Johnson&background=D6805F&color=fff"
  },
  {
    firstName: "Robert",
    lastName: "Anderson",
    email: "randerson@example.com",
    phoneNumber: "(555) 345-6789",
    address: "789 Elm St, Springfield, IL 62703",
    familyMembers: [
      {
        firstName: "Mary",
        lastName: "Anderson",
        relationship: "Wife"
      },
      {
        firstName: "James",
        lastName: "Anderson",
        relationship: "Son"
      },
      {
        firstName: "Emily",
        lastName: "Anderson",
        relationship: "Daughter"
      }
    ]
  },
  {
    firstName: "Patricia",
    lastName: "Wilson",
    email: "pwilson@example.com",
    phoneNumber: "(555) 456-7890",
    address: "321 Pine Rd, Springfield, IL 62704",
    photoURL: "https://ui-avatars.com/api/?name=Patricia+Wilson&background=D6805F&color=fff"
  },
  {
    firstName: "David",
    lastName: "Brown",
    email: "dbrown@example.com",
    phoneNumber: "(555) 567-8901",
    address: "654 Maple Dr, Springfield, IL 62705",
    familyMembers: [
      {
        firstName: "Linda",
        lastName: "Brown",
        relationship: "Wife"
      }
    ]
  },
  {
    firstName: "Elizabeth",
    lastName: "Taylor",
    email: "etaylor@example.com",
    phoneNumber: "(555) 678-9012",
    address: "987 Cedar Ln, Springfield, IL 62706",
    photoURL: "https://ui-avatars.com/api/?name=Elizabeth+Taylor&background=D6805F&color=fff"
  }
];

async function seedDirectory() {
  try {
    const membersRef = db.collection('members');
    
    // Delete existing members
    const existingMembers = await membersRef.get();
    const batch = db.batch();
    existingMembers.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();
    console.log('Cleared existing members');
    
    // Add new members
    for (const member of sampleMembers) {
      await membersRef.add(member);
      console.log(`Added member: ${member.firstName} ${member.lastName}`);
    }
    
    console.log('Directory seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding directory:', error);
    process.exit(1);
  }
}

// Run the seeding function
seedDirectory(); 