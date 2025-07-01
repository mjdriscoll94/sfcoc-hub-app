export const convertToDate = (timestamp: any): Date => {
  if (!timestamp) {
    return new Date();
  }

  // Handle Firestore Timestamp
  if (timestamp?.toDate && typeof timestamp.toDate === 'function') {
    return timestamp.toDate();
  }

  // Handle JavaScript Date
  if (timestamp instanceof Date) {
    return timestamp;
  }

  // Handle Firestore Timestamp after serialization
  if (timestamp?._seconds) {
    return new Date(timestamp._seconds * 1000);
  }

  // Handle ISO string
  if (typeof timestamp === 'string') {
    const date = new Date(timestamp);
    return isNaN(date.getTime()) ? new Date() : date;
  }

  // Handle numeric timestamp
  if (typeof timestamp === 'number') {
    return new Date(timestamp);
  }

  return new Date();
}; 