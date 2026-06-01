import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  Timestamp,
  addDoc,
  writeBatch
} from "firebase/firestore";
import { db, auth } from "../firebase";
import { Project, ProjectPhoto, UserProfile, WeeklyReport, Provider, ProjectEvaluation, AHSP, LaborMaster, MaterialMaster, EquipmentMaster, RABItem } from "../types";

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: any[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// User Profile
export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  const path = `users/${uid}`;
  try {
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as UserProfile;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
};

export const getUserProfileByEmail = async (email: string): Promise<UserProfile | null> => {
  const path = 'users';
  try {
    const q = query(collection(db, 'users'), where('email', '==', email));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      return querySnapshot.docs[0].data() as UserProfile;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return null;
  }
};

export const getUserProfileByUsername = async (username: string): Promise<UserProfile | null> => {
  const path = 'users';
  try {
    const q = query(collection(db, 'users'), where('username', '==', username));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      return querySnapshot.docs[0].data() as UserProfile;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return null;
  }
};

export const createUserProfile = async (profile: UserProfile) => {
  const path = `users/${profile.uid}`;
  try {
    await setDoc(doc(db, 'users', profile.uid), profile);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const getUsers = (callback: (users: UserProfile[]) => void) => {
  const path = 'users';
  const q = query(collection(db, 'users'), orderBy('email', 'asc'));
  return onSnapshot(q, (snapshot) => {
    const users = snapshot.docs.map(doc => ({ ...doc.data() } as UserProfile));
    callback(users);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, path);
  });
};

export const updateUserRole = async (uid: string, role: UserProfile['role']) => {
  const path = `users/${uid}`;
  try {
    await updateDoc(doc(db, 'users', uid), { role });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

export const updateUserProfile = async (uid: string, updates: Partial<UserProfile>) => {
  const path = `users/${uid}`;
  try {
    await updateDoc(doc(db, 'users', uid), updates);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

export const deleteUser = async (uid: string) => {
  const path = `users/${uid}`;
  try {
    await deleteDoc(doc(db, 'users', uid));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

export const addUser = async (userData: Omit<UserProfile, 'uid'>) => {
  const path = 'users';
  try {
    // We use email as a temporary ID if uid is not available yet
    // This will be linked when the user logs in for the first time
    const tempId = `pending_${userData.email.replace(/[^a-zA-Z0-9]/g, '_')}`;
    await setDoc(doc(db, 'users', tempId), {
      ...userData,
      uid: tempId, // Placeholder
      isPending: true
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

// Projects
export const getProjects = (callback: (projects: Project[]) => void) => {
  const path = 'projects';
  const q = query(collection(db, 'projects'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const projects = snapshot.docs.map(doc => {
      const data = doc.data();
      return { 
        id: doc.id, 
        ...data,
        // Backward compatibility for renamed field
        ptCv: data.ptCv || data.instansi || '',
        name: data.name || '',
        location: data.location || ''
      } as Project;
    });
    callback(projects);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, path);
  });
};

export const addProject = async (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => {
  const path = 'projects';
  try {
    const now = Timestamp.now();
    await addDoc(collection(db, 'projects'), {
      ...project,
      createdAt: now,
      updatedAt: now
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

export const updateProject = async (id: string, updates: Partial<Project>) => {
  const path = `projects/${id}`;
  try {
    await updateDoc(doc(db, 'projects', id), {
      ...updates,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

export const deleteProject = async (id: string) => {
  const path = `projects/${id}`;
  try {
    await deleteDoc(doc(db, 'projects', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

// Photos
export const getProjectPhotos = (projectId: string, callback: (photos: ProjectPhoto[]) => void) => {
  const path = `projects/${projectId}/photos`;
  const q = query(collection(db, 'projects', projectId, 'photos'), orderBy('date', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const photos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProjectPhoto));
    callback(photos);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, path);
  });
};

export const getAllPhotos = (callback: (photos: ProjectPhoto[]) => void) => {
  // This is a bit tricky with subcollections, but for simplicity we'll just fetch all projects and their photos
  // In a real app, you might use a collection group query or denormalize.
  // For this demo, we'll just fetch photos for a specific project or use a collection group if enabled.
  // Let's use a simpler approach: a top-level 'photos' collection for global feed if needed, 
  // but the user asked for "Documentation based on category".
  // I'll stick to project-specific photos for now.
};

export const addPhoto = async (projectId: string, photo: Omit<ProjectPhoto, 'id'>) => {
  const path = `projects/${projectId}/photos`;
  try {
    await addDoc(collection(db, 'projects', projectId, 'photos'), photo);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

// Weekly Reports
export const getWeeklyReports = (projectId: string, callback: (reports: WeeklyReport[]) => void) => {
  const path = `projects/${projectId}/weekly_reports`;
  const q = query(collection(db, 'projects', projectId, 'weekly_reports'), orderBy('weekNumber', 'asc'));
  return onSnapshot(q, (snapshot) => {
    const reports = snapshot.docs.map(doc => {
      const data = doc.data();
      return { 
        id: doc.id, 
        ...data,
        startDate: data.startDate || '',
        endDate: data.endDate || '',
        notes: data.notes || ''
      } as WeeklyReport;
    });
    callback(reports);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, path);
  });
};

export const addWeeklyReport = async (projectId: string, report: Omit<WeeklyReport, 'id'>) => {
  const path = `projects/${projectId}/weekly_reports`;
  try {
    await addDoc(collection(db, 'projects', projectId, 'weekly_reports'), report);
    
    // Update project progress
    await updateProject(projectId, { progress: report.cumulativeProgress });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

export const updateWeeklyReport = async (projectId: string, reportId: string, updates: Partial<WeeklyReport>) => {
  const path = `projects/${projectId}/weekly_reports/${reportId}`;
  try {
    await updateDoc(doc(db, 'projects', projectId, 'weekly_reports', reportId), updates);
    
    // If cumulative progress is updated, update project as well
    if (updates.cumulativeProgress !== undefined) {
      await updateProject(projectId, { progress: updates.cumulativeProgress });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

export const deleteWeeklyReport = async (projectId: string, reportId: string) => {
  const path = `projects/${projectId}/weekly_reports/${reportId}`;
  try {
    await deleteDoc(doc(db, 'projects', projectId, 'weekly_reports', reportId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

// Evaluations
export const getProjectEvaluations = (callback: (evaluations: ProjectEvaluation[]) => void) => {
  const path = 'evaluations';
  const q = query(collection(db, 'evaluations'));
  return onSnapshot(q, (snapshot) => {
    const evaluations = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProjectEvaluation));
    callback(evaluations);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, path);
  });
};

export const getProjectEvaluation = async (projectId: string): Promise<ProjectEvaluation | null> => {
  const path = 'evaluations';
  try {
    const q = query(collection(db, 'evaluations'), where('projectId', '==', projectId));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      return { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() } as ProjectEvaluation;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return null;
  }
};

export const addProjectEvaluation = async (evaluation: Omit<ProjectEvaluation, 'id' | 'createdAt' | 'updatedAt'>) => {
  const path = 'evaluations';
  try {
    const now = Timestamp.now();
    await addDoc(collection(db, 'evaluations'), {
      ...evaluation,
      createdAt: now,
      updatedAt: now
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

export const updateProjectEvaluation = async (id: string, updates: Partial<ProjectEvaluation>) => {
  const path = `evaluations/${id}`;
  try {
    await updateDoc(doc(db, 'evaluations', id), {
      ...updates,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

// Providers
export const getProviders = (callback: (providers: Provider[]) => void) => {
  const path = 'providers';
  const q = query(collection(db, 'providers'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const providers = snapshot.docs.map(doc => {
      const data = doc.data();
      return { 
        id: doc.id, 
        ...data,
        name: data.name || '',
        address: data.address || '',
        npwp: data.npwp || '',
        email: data.email || '',
        phone: data.phone || ''
      } as Provider;
    });
    callback(providers);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, path);
  });
};

export const addProvider = async (provider: Omit<Provider, 'id' | 'createdAt' | 'updatedAt'>) => {
  const path = 'providers';
  try {
    const now = Timestamp.now();
    await addDoc(collection(db, 'providers'), {
      ...provider,
      createdAt: now,
      updatedAt: now
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

export const updateProvider = async (id: string, updates: Partial<Provider>) => {
  const path = `providers/${id}`;
  try {
    await updateDoc(doc(db, 'providers', id), {
      ...updates,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

export const deleteProvider = async (id: string) => {
  const path = `providers/${id}`;
  try {
    await deleteDoc(doc(db, 'providers', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

// AHSP
export const getAHSPs = (callback: (ahsps: AHSP[]) => void) => {
  const path = 'ahsps';
  const q = query(collection(db, 'ahsps'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const ahsps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AHSP));
    callback(ahsps);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, path);
  });
};

export const addAHSP = async (ahsp: Omit<AHSP, 'id' | 'createdAt' | 'updatedAt'>) => {
  const path = 'ahsps';
  try {
    const now = Timestamp.now();
    await addDoc(collection(db, 'ahsps'), {
      ...ahsp,
      createdAt: now,
      updatedAt: now
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

export const updateAHSP = async (id: string, updates: Partial<AHSP>) => {
  const path = `ahsps/${id}`;
  try {
    await updateDoc(doc(db, 'ahsps', id), {
      ...updates,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

export const deleteAHSP = async (id: string) => {
  const path = `ahsps/${id}`;
  try {
    await deleteDoc(doc(db, 'ahsps', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

export const resetAHSPs = async () => {
  const path = 'ahsps';
  try {
    const q = query(collection(db, 'ahsps'));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) return;

    const batch = writeBatch(db);
    snapshot.docs.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });
    
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

export const resetLaborMasters = async () => {
  const path = 'labor_masters';
  try {
    const snapshot = await getDocs(query(collection(db, 'labor_masters')));
    const batch = writeBatch(db);
    snapshot.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

export const resetMaterialMasters = async () => {
  const path = 'material_masters';
  try {
    const snapshot = await getDocs(query(collection(db, 'material_masters')));
    const batch = writeBatch(db);
    snapshot.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

export const resetEquipmentMasters = async () => {
  const path = 'equipment_masters';
  try {
    const snapshot = await getDocs(query(collection(db, 'equipment_masters')));
    const batch = writeBatch(db);
    snapshot.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

// Labor Master
export const getLaborMasters = (callback: (masters: LaborMaster[]) => void) => {
  const path = 'labor_masters';
  const q = query(collection(db, 'labor_masters'), orderBy('code', 'asc'));
  return onSnapshot(q, (snapshot) => {
    const masters = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LaborMaster));
    callback(masters);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, path);
  });
};

export const addLaborMaster = async (master: Omit<LaborMaster, 'id'>) => {
  const path = 'labor_masters';
  try {
    const docRef = await addDoc(collection(db, 'labor_masters'), master);
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

// Material Master
export const getMaterialMasters = (callback: (masters: MaterialMaster[]) => void) => {
  const path = 'material_masters';
  const q = query(collection(db, 'material_masters'), orderBy('code', 'asc'));
  return onSnapshot(q, (snapshot) => {
    const masters = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MaterialMaster));
    callback(masters);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, path);
  });
};

export const addMaterialMaster = async (master: Omit<MaterialMaster, 'id'>) => {
  const path = 'material_masters';
  try {
    const docRef = await addDoc(collection(db, 'material_masters'), master);
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

export const updateMaterialMaster = async (id: string, master: Partial<MaterialMaster>) => {
  const path = `material_masters/${id}`;
  try {
    await updateDoc(doc(db, 'material_masters', id), master);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

export const deleteMaterialMaster = async (id: string) => {
  const path = `material_masters/${id}`;
  try {
    await deleteDoc(doc(db, 'material_masters', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

// Equipment Master
export const getEquipmentMasters = (callback: (masters: EquipmentMaster[]) => void) => {
  const path = 'equipment_masters';
  const q = query(collection(db, 'equipment_masters'), orderBy('code', 'asc'));
  return onSnapshot(q, (snapshot) => {
    const masters = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EquipmentMaster));
    callback(masters);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, path);
  });
};

export const addEquipmentMaster = async (master: Omit<EquipmentMaster, 'id'>) => {
  const path = 'equipment_masters';
  try {
    const docRef = await addDoc(collection(db, 'equipment_masters'), master);
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

export const updateEquipmentMaster = async (id: string, master: Partial<EquipmentMaster>) => {
  const path = `equipment_masters/${id}`;
  try {
    await updateDoc(doc(db, 'equipment_masters', id), master);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

export const deleteEquipmentMaster = async (id: string) => {
  const path = `equipment_masters/${id}`;
  try {
    await deleteDoc(doc(db, 'equipment_masters', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

// Also add update/delete for LaborMaster since they were missing
export const updateLaborMaster = async (id: string, master: Partial<LaborMaster>) => {
  const path = `labor_masters/${id}`;
  try {
    await updateDoc(doc(db, 'labor_masters', id), master);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

export const deleteLaborMaster = async (id: string) => {
  const path = `labor_masters/${id}`;
  try {
    await deleteDoc(doc(db, 'labor_masters', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

// Helper to remove undefined properties from objects before sending to Firestore
function cleanUndefined<T>(obj: T): any {
  if (!obj) return obj;
  const result = { ...obj } as any;
  Object.keys(result).forEach(key => {
    if (result[key] === undefined) {
      delete result[key];
    }
  });
  return result;
}

// RAB
export const getRABItems = (projectId: string, callback: (items: RABItem[]) => void) => {
  const path = `projects/${projectId}/rab`;
  const q = query(collection(db, 'projects', projectId, 'rab'));
  return onSnapshot(q, (snapshot) => {
    const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RABItem));
    callback(items);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, path);
  });
};

export const addRABItem = async (projectId: string, item: Omit<RABItem, 'id'>) => {
  const path = `projects/${projectId}/rab`;
  try {
    const cleanedItem = cleanUndefined(item);
    await addDoc(collection(db, 'projects', projectId, 'rab'), cleanedItem);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

export const updateRABItem = async (projectId: string, itemId: string, updates: Partial<RABItem>) => {
  const path = `projects/${projectId}/rab/${itemId}`;
  try {
    const cleanedUpdates = cleanUndefined(updates);
    await updateDoc(doc(db, 'projects', projectId, 'rab', itemId), cleanedUpdates);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

export const deleteRABItem = async (projectId: string, itemId: string) => {
  const path = `projects/${projectId}/rab/${itemId}`;
  try {
    const batch = writeBatch(db);
    
    // 1. Delete the RAB item
    batch.delete(doc(db, 'projects', projectId, 'rab', itemId));
    
    // 2. Remove from all weekly reports
    const reportsRef = collection(db, 'projects', projectId, 'weekly_reports');
    const reportsSnapshot = await getDocs(reportsRef);
    
    reportsSnapshot.docs.forEach(reportDoc => {
      const data = reportDoc.data() as WeeklyReport;
      if (data.details) {
        const filteredDetails = data.details.filter(d => d.rabItemId !== itemId);
        if (filteredDetails.length !== data.details.length) {
          batch.update(reportDoc.ref, { details: filteredDetails });
        }
      }
    });

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

export const addRABItemsBulk = async (projectId: string, items: Omit<RABItem, 'id'>[]) => {
  const path = `projects/${projectId}/rab (bulk)`;
  try {
    const batch = writeBatch(db);
    const rabRef = collection(db, 'projects', projectId, 'rab');
    
    items.forEach(item => {
      const newDocRef = doc(rabRef);
      const cleanedItem = cleanUndefined(item);
      batch.set(newDocRef, cleanedItem);
    });
    
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const deleteAllRABItems = async (projectId: string, itemIds: string[]) => {
  const path = `projects/${projectId}/rab (delete bulk)`;
  try {
    const batch = writeBatch(db);
    
    // 1. Delete all RAB items
    itemIds.forEach(id => {
      const docRef = doc(db, 'projects', projectId, 'rab', id);
      batch.delete(docRef);
    });

    // 2. Remove all those items from all weekly reports
    const reportsRef = collection(db, 'projects', projectId, 'weekly_reports');
    const reportsSnapshot = await getDocs(reportsRef);
    const itemIdsSet = new Set(itemIds);
    
    reportsSnapshot.docs.forEach(reportDoc => {
      const data = reportDoc.data() as WeeklyReport;
      if (data.details) {
        const filteredDetails = data.details.filter(d => !itemIdsSet.has(d.rabItemId));
        if (filteredDetails.length !== data.details.length) {
          batch.update(reportDoc.ref, { details: filteredDetails });
        }
      }
    });

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};
