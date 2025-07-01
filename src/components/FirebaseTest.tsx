'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase/config';
import { collection, addDoc, getDocs, Timestamp } from 'firebase/firestore';
import { getApp } from 'firebase/app';

export default function FirebaseTest() {
  const [testStatus, setTestStatus] = useState<string>('Not started');
  const [readResult, setReadResult] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [projectInfo, setProjectInfo] = useState<string>('');

  useEffect(() => {
    try {
      const app = getApp();
      setProjectInfo(`Current Project ID: ${app.options.projectId}`);
    } catch (error) {
      setProjectInfo('Could not get project info');
    }
  }, []);

  const runTest = async () => {
    try {
      setTestStatus('Testing...');
      setError('');

      // Log the database instance and project details
      const app = getApp();
      console.log('Firebase Config:', {
        projectId: app.options.projectId,
        authDomain: app.options.authDomain
      });

      // Test writing to Firestore
      console.log('Attempting to write to Firestore...');
      const testDoc = await addDoc(collection(db, 'test'), {
        message: 'Test connection',
        timestamp: Timestamp.now()
      });
      console.log('Write successful:', testDoc.id);
      setTestStatus('Write successful. Document ID: ' + testDoc.id);

      // Test reading from Firestore
      console.log('Attempting to read from Firestore...');
      const querySnapshot = await getDocs(collection(db, 'test'));
      const documents = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      console.log('Read successful:', documents);
      setReadResult(`Read successful. Found ${documents.length} documents.`);

    } catch (error) {
      console.error('Firebase operation failed:', error);
      const errorMessage = error instanceof Error 
        ? `${error.name}: ${error.message}` 
        : 'Unknown error occurred';
      setError(errorMessage);
      setTestStatus('Failed');
    }
  };

  return (
    <div className="p-4 border rounded-lg shadow-sm max-w-md mx-auto mt-8">
      <h2 className="text-xl font-semibold mb-4">Firebase Connection Test</h2>
      
      <div className="space-y-4">
        <div className="bg-gray-50 p-3 rounded">
          <p className="font-medium">Project Information:</p>
          <p className="text-gray-600 font-mono text-sm">{projectInfo}</p>
        </div>

        <div>
          <p className="font-medium">Write Test Status:</p>
          <p className="text-gray-600">{testStatus}</p>
        </div>

        <div>
          <p className="font-medium">Read Test Result:</p>
          <p className="text-gray-600">{readResult}</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded p-3">
            <p className="font-medium text-red-800">Error Details:</p>
            <p className="text-red-600 text-sm font-mono whitespace-pre-wrap">{error}</p>
          </div>
        )}

        <button
          onClick={runTest}
          className="bg-coral text-white px-4 py-2 rounded hover:bg-opacity-90 transition-colors"
        >
          Run Test
        </button>
      </div>
    </div>
  );
} 