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
import { Project, ProjectPhoto, UserProfile, WeeklyReport, Provider, ProjectEvaluation, AHSP, LaborMaster, MaterialMaster, EquipmentMaster, RABItem, TechnicalSpec, ProjectChatMessage } from "../types";

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

// Helper to remove undefined properties from objects and nested arrays/objects before sending to Firestore
export function deepCleanUndefined<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj
      .filter(item => item !== undefined)
      .map(item => deepCleanUndefined(item)) as unknown as T;
  }
  if (typeof obj === 'object') {
    // Keep Timestamp or other special objects intact
    if (obj instanceof Timestamp || obj instanceof Date) {
      return obj;
    }
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        result[key] = deepCleanUndefined(value);
      }
    }
    return result;
  }
  return obj;
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
    await setDoc(doc(db, 'users', profile.uid), deepCleanUndefined(profile));
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
    await updateDoc(doc(db, 'users', uid), deepCleanUndefined(updates));
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
    await setDoc(doc(db, 'users', tempId), deepCleanUndefined({
      ...userData,
      uid: tempId, // Placeholder
      isPending: true
    }));
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
    await addDoc(collection(db, 'projects'), deepCleanUndefined({
      ...project,
      createdAt: now,
      updatedAt: now
    }));
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

export const updateProject = async (id: string, updates: Partial<Project>) => {
  const path = `projects/${id}`;
  try {
    await updateDoc(doc(db, 'projects', id), deepCleanUndefined({
      ...updates,
      updatedAt: Timestamp.now()
    }));
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
    await addDoc(collection(db, 'projects', projectId, 'photos'), deepCleanUndefined(photo));
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

export const deletePhoto = async (projectId: string, photoId: string) => {
  const path = `projects/${projectId}/photos/${photoId}`;
  try {
    await deleteDoc(doc(db, 'projects', projectId, 'photos', photoId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
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
    const cleaned = deepCleanUndefined(report);
    await addDoc(collection(db, 'projects', projectId, 'weekly_reports'), cleaned);
    
    // Update project progress
    await updateProject(projectId, { progress: report.cumulativeProgress });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

export const updateWeeklyReport = async (projectId: string, reportId: string, updates: Partial<WeeklyReport>) => {
  const path = `projects/${projectId}/weekly_reports/${reportId}`;
  try {
    const cleaned = deepCleanUndefined(updates);
    await updateDoc(doc(db, 'projects', projectId, 'weekly_reports', reportId), cleaned);
    
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
    await addDoc(collection(db, 'evaluations'), deepCleanUndefined({
      ...evaluation,
      createdAt: now,
      updatedAt: now
    }));
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

export const updateProjectEvaluation = async (id: string, updates: Partial<ProjectEvaluation>) => {
  const path = `evaluations/${id}`;
  try {
    await updateDoc(doc(db, 'evaluations', id), deepCleanUndefined({
      ...updates,
      updatedAt: Timestamp.now()
    }));
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
    await addDoc(collection(db, 'providers'), deepCleanUndefined({
      ...provider,
      createdAt: now,
      updatedAt: now
    }));
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

export const updateProvider = async (id: string, updates: Partial<Provider>) => {
  const path = `providers/${id}`;
  try {
    await updateDoc(doc(db, 'providers', id), deepCleanUndefined({
      ...updates,
      updatedAt: Timestamp.now()
    }));
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
    await addDoc(collection(db, 'ahsps'), deepCleanUndefined({
      ...ahsp,
      createdAt: now,
      updatedAt: now
    }));
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

export const updateAHSP = async (id: string, updates: Partial<AHSP>) => {
  const path = `ahsps/${id}`;
  try {
    await updateDoc(doc(db, 'ahsps', id), deepCleanUndefined({
      ...updates,
      updatedAt: Timestamp.now()
    }));
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
    const docRef = await addDoc(collection(db, 'labor_masters'), deepCleanUndefined(master));
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
    const docRef = await addDoc(collection(db, 'material_masters'), deepCleanUndefined(master));
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

export const updateMaterialMaster = async (id: string, master: Partial<MaterialMaster>) => {
  const path = `material_masters/${id}`;
  try {
    await updateDoc(doc(db, 'material_masters', id), deepCleanUndefined(master));
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
    const docRef = await addDoc(collection(db, 'equipment_masters'), deepCleanUndefined(master));
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

export const updateEquipmentMaster = async (id: string, master: Partial<EquipmentMaster>) => {
  const path = `equipment_masters/${id}`;
  try {
    await updateDoc(doc(db, 'equipment_masters', id), deepCleanUndefined(master));
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
    await updateDoc(doc(db, 'labor_masters', id), deepCleanUndefined(master));
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
    const cleanedItem = deepCleanUndefined(item);
    await addDoc(collection(db, 'projects', projectId, 'rab'), cleanedItem);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

export const updateRABItem = async (projectId: string, itemId: string, updates: Partial<RABItem>) => {
  const path = `projects/${projectId}/rab/${itemId}`;
  try {
    const cleanedUpdates = deepCleanUndefined(updates);
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
      const cleanedItem = deepCleanUndefined(item);
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

// ==========================================
// Spesifikasi Teknis (Technical Specifications)
// ==========================================

export const getTechnicalSpecs = (callback: (specs: TechnicalSpec[]) => void, projectId?: string) => {
  const path = 'technical_specs';
  const specsRef = collection(db, 'technical_specs');
  const q = query(specsRef, orderBy('createdAt', 'desc'));

  return onSnapshot(q, (snapshot) => {
    let specs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as TechnicalSpec));

    if (projectId && projectId !== 'all') {
      specs = specs.filter(s => !s.projectId || s.projectId === projectId || s.projectId === 'all');
    }

    callback(specs);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, path);
  });
};

export const addTechnicalSpec = async (spec: Omit<TechnicalSpec, 'id'>) => {
  const path = 'technical_specs';
  try {
    const cleanedSpec = deepCleanUndefined({
      ...spec,
      createdAt: spec.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    const docRef = await addDoc(collection(db, 'technical_specs'), cleanedSpec);
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    throw error;
  }
};

export const updateTechnicalSpec = async (specId: string, updates: Partial<TechnicalSpec>) => {
  const path = `technical_specs/${specId}`;
  try {
    const cleanedUpdates = deepCleanUndefined({
      ...updates,
      updatedAt: new Date().toISOString()
    });
    await updateDoc(doc(db, 'technical_specs', specId), cleanedUpdates);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
    throw error;
  }
};

export const deleteTechnicalSpec = async (specId: string) => {
  const path = `technical_specs/${specId}`;
  try {
    await deleteDoc(doc(db, 'technical_specs', specId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    throw error;
  }
};

export const seedDefaultTechnicalSpecs = async () => {
  const defaultSpecs: Omit<TechnicalSpec, 'id'>[] = [
    {
      specType: 'Pekerjaan Beton Struktur (K-250 / fc 20 MPa)',
      category: 'Pekerjaan Struktur',
      standardReference: 'SNI 2847:2019 / Spesifikasi Umum Bina Marga 2018 Divisi 7',
      criticalPoints: '1. Nilai Slump beton (toleransi ±2 cm)\n2. Pengambilan benda uji silinder/kubus (minimal 3 set per batch)\n3. Selimut beton & jarak tahu beton (minimum 3-4 cm)\n4. Pemadatan dengan concrete vibrator (hindari keropos/honeycomb)\n5. Curing/pembasahan beton minimal 7 hari',
      acceptanceCriteria: 'Kuat tekan beton umur 28 hari mencapai f\'c min 20 MPa (100% target desain). Nilai slump rencana 10 ± 2 cm.',
      inspectionTools: 'Kerucut Slump, Tongkat Pemadat, Thermometer Beton, Cetakan Kubus/Silinder 15x30cm, Caliper/Meteran',
      inspectionProcedure: `1. PEMERIKSAAN PRA-PENGECORAN (PRE-POUR INSPECTION):
   a. Periksa kesiapan bekisting: kebersihan dari kotoran/potongan kawat, kerapatan sambungan (bebas celah kebocoran pasta semen), serta kekokohan perancah/skur penopang.
   b. Periksa pembesian: diameter besi tulangan, jumlah batang, jarak sengkang/begel, panjang penyaluran/lewat sambungan tulangan (minimum 40D), dan pemasangan beton decking/tahu beton (tebal selimut beton 3-4 cm).
   c. Periksa kesiapan izin kerja (Request for Work / Ijin Cor) dan ketersediaan peralatan (vibrator min 2 unit, pencahayaan jika malam, terpal pelindung hujan).

2. PEMERIKSAAN SAAT PENGECORAN (DURING POUR INSPECTION):
   a. Lakukan pengujian slump (Slump Test) pada setiap truk mixer/adukan beton segar (standar 10 ± 2 cm). Catat waktu batching dan waktu tiba di lokasi (maksimum 90 menit atau 300 putaran mixer).
   b. Ambil sampel benda uji kubus (15x15x15 cm) atau silinder (diameter 15 cm x tinggi 30 cm) untuk pengujian kuat tekan umur 7, 14, dan 28 hari.
   c. Awasi pemadatan beton menggunakan vibrator mekanis dengan sudut tusuk vertikal 90°, interval 30-50 cm, durasi 5-15 detik per titik (tidak boleh menyentuh tulangan utama secara berlebihan).
   d. Pastikan tinggi jatuh beton bebas tidak melebihi 1,5 meter untuk mencegah segregasi agregat kasar.

3. PEMERIKSAAN PASCA-PENGECORAN (POST-POUR INSPECTION):
   a. Pastikan proses perawatan beton (curing) dimulai sesaat setelah beton mulai mengeras (initial set) dengan metode penyiraman terus menerus atau penutupan karung basah selama minimal 7 hari berturut-turut.
   b. Periksa pembongkaran bekisting: bekisting samping minimal 3 hari, bekisting bawah/penyangga struktur balok/plat minimal 14-21 hari atau setelah kuat tekan mencapai 85% f'c.
   c. Lakukan inspeksi visual visual pasca-bongkar: tidak boleh ada segregasi parah, keropos (honeycomb), atau retak struktural. Jika terdapat keropos ringan, lakukan perbaikan (grouting) dengan material non-shrink grout berstandar teknis.`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      specType: 'Pekerjaan Baja Tulangan (Besi Beton Polos & Ulir/Deform)',
      category: 'Pekerjaan Struktur',
      standardReference: 'SNI 2052:2017 (Baja Tulangan Beton)',
      criticalPoints: '1. Keaslian label/sertifikat pabrik (Mill Certificate SNI)\n2. Toleransi diameter nominal (maksimal ±0.4 mm)\n3. Kebersihan besi dari karat lepas, minyak, oli, lumpur\n4. Ketepatan pola pembengkokan (bending hook 135° untuk gempa)',
      acceptanceCriteria: 'Besi tulangan harus memenuhi kuat leleh fy min 280 MPa (BjTP 280) untuk polos dan fy min 420 MPa (BjTS 420) untuk ulir/sirip.',
      inspectionTools: 'Jangka Sorong (Vernier Caliper), Meteran Baja, Timbangan Analitik (uji berat per meter), Mesin Uji Tarik Lab',
      inspectionProcedure: `1. PEMERIKSAAN MATERIAL MASUK (INCOMING MATERIAL):
   a. Cek fisik marking SNI pada batang tulangan (merk pabrikan, kelas baja, ukuran diameter nominal).
   b. Periksa Mill Certificate dari pabrikan dan pastikan nomor leburan (heat number) cocok dengan dokumen pengiriman.
   c. Lakukan uji sampling tarik dan tekuk di laboratorium independen yang terakreditasi KAN (Komite Akreditasi Nasional) jika disyaratkan dalam dokumen kontrak.
   d. Periksa kondisi penyimpanan di lokasi proyek: besi harus diletakkan di atas ganjal kayu (min 15 cm dari tanah) dan tertutup terpal untuk mencegah karat dini.

2. PEMERIKSAAN PEMOTONGAN & PEMBENGKOKAN (FABRIKASI):
   a. Cek daftar potongan besi (Bar Bending Schedule - BBS) terhadap gambar kerja (Shop Drawing) yang telah disetujui.
   b. Pastikan pembengkokan dilakukan dalam kondisi dingin (cold bend) dan menggunakan mandril dengan diameter minimum sesuai SNI (hindari tekukan patah/retak rambut).
   c. Periksa panjang kait/hook standar gempa: kait 135° dengan perpanjangan lurus minimal 6D atau 75 mm untuk begel/sengkang kolom dan balok.

3. PEMERIKSAAN PEMASANGAN DI LAPANGAN (ASSEMBLY):
   a. Cek jumlah dan posisi tulangan utama (longitudinal) dan sengkang/begel (transversal) sesuai gambar kerja.
   b. Periksa pengikatan kawat bendrat: harus diikat silang kuat dan ujung kawat ditekuk ke arah dalam.
   c. Pastikan jarak antar lapis tulangan dan jarak selimut beton dipasang tahu beton berkekuatan setara f'c struktur dengan kerapatan 4 buah per meter persegi.`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      specType: 'Pekerjaan Galian Tanah & Pondasi Batu Belah',
      category: 'Pekerjaan Tanah & Pondasi',
      standardReference: 'Spesifikasi Umum Bina Marga 2018 Divisi 3 / Permen PUPR',
      criticalPoints: '1. Kedalaman dan elevasi dasar galian sesuai profil desain\n2. Daya dukung tanah dasar (bebas lumpur/tanah humus)\n3. Komposisi spesi adukan semen pasir (1 PC : 3 Pasir atau 1 PC : 4 Pasir)\n4. Batu belah keras, padat, bersudut tajam (tidak porous)',
      acceptanceCriteria: 'Dasar galian padat dan kering. Pasangan batu terisi penuh mortar spesi tanpa rongga kosong. Kemiringan dan ketebalan sesuai gambar bestek.',
      inspectionTools: 'Waterpass / Theodolite / Total Station, Meteran Baja, Dynamic Cone Penetrometer (DCP) / Kotak Takaran Mortar',
      inspectionProcedure: `1. PEMERIKSAAN SEBELUM PENGGALIAN (PRE-EXCAVATION):
   a. Periksa titik patok ukur (Bouwplank) dan elevasi BM (Bench Mark) yang telah disetujui bersama konsultan perencana dan pengawas.
   b. Cek jalur utilitas eksisting (pipa air bawah tanah, kabel listrik/telekomunikasi, saluran drainase sekitar).

2. PEMERIKSAAN SAAT GALIAN & PERSIAPAN DASAR:
   a. Periksa dimensi lebar atas, lebar bawah, dan kedalaman dasar galian menggunakan alat ukur waterpass/theodolite.
   b. Pastikan dasar galian bersih dari genangan air, lumpur lembek, sampah, atau akar tanaman. Lakukan pemadatan tanah dasar (subgrade compaction).
   c. Lakukan penghamparan lapisan pasir urug (sand bed) setebal 5 - 10 cm kemudian dipadatkan dan disiram air secukupnya.
   d. Pasang batu anstamping (batu kosong dipasang berdiri tegak) dan diisi pasir pada sela-selanya hingga padat.

3. PEMERIKSAAN PEMASANGAN BATU BELAH (PONDASI):
   a. Cek mutu batu belah: batu kali/batu gunung yang keras, bersih, bebas kotoran tanah/lumut, dan memiliki minimal 3 bidang pecah.
   b. Pastikan batu dibasahi air terlebih dahulu sebelum dipasang agar tidak menyerap air semen pada mortar.
   c. Periksa pencampuran mortar spesi semen-pasir menggunakan molen/mixer dengan takaran perbandingan volume yang konsisten (1:3 atau 1:4).
   d. Pastikan setiap batu terbungkus adukan mortar secara merata setebal min 2-3 cm (batu tidak boleh saling bersentuhan langsung tanpa spesi).
   e. Lakukan pemasangan stek besi angkur kolom praktis (diameter min 10-12 mm) yang tertanam kokoh ke dalam pasangan batu pondasi minimal 40 cm.`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      specType: 'Pekerjaan Pasangan Dinding Bata Ringan (AAC) & Plesteran',
      category: 'Pekerjaan Arsitektur',
      standardReference: 'SNI 03-6825-2002 / SNI 03-0349-1989',
      criticalPoints: '1. Kelurusan benang vertikal dan horizontal (lot bandul)\n2. Ketebalan perekat mortar instan thinbed (2 - 3 mm)\n3. Pemasangan angkur plat dinding ke kolom struktur setiap 3 lapis bata\n4. Pemasangan balok/kolom praktis setiap luasan dinding maksimal 9-12 m²',
      acceptanceCriteria: 'Dinding tegak lurus (deviasi < 3 mm per 2 m tinggi), spesi thinbed terisi merata, permukaan plesteran rata dan tidak bergelombang/retak rambut.',
      inspectionTools: 'Waterpass Panjang (Aluminium Level 1.2m), Lot Bandul (Plumb Bob), Roskam Bergigi (Notched Trowel), Palu Karet, Meteran',
      inspectionProcedure: `1. PEMERIKSAAN MATERIAL & PERSIAPAN:
   a. Cek spesifikasi bata ringan AAC: presisi dimensi (panjang, lebar, tebal), bobot volume kering (550-650 kg/m³), dan kuat tekan min 4.0 N/mm².
   b. Cek material semen instan perekat (Thinbed Mortar) dan semen instan plesteran/acian sesuai merk yang disetujui dalam dokumen RKS.
   c. Pastikan sloof/lantai kerja dasar sudah dibersihkan dan dipasang lapisan waterproofing atau trasram anti-lembab.

2. PEMERIKSAAN SAAT PEMASANGAN BATA:
   a. Pasang lapisan dasar pertama menggunakan adukan semen-pasir biasa (1:3) untuk leveling awal yang presisi sempurna dengan waterpass.
   b. Pemasangan lapis kedua dan seterusnya menggunakan perekat thinbed dengan roskam bergigi (tebal 2-3 mm) secara merata pada permukaan horizontal dan vertikal.
   c. Periksa pemasangan besi stek/angkur plat pengikat dinding ke kolom beton struktur setiap jarak 60 cm (3 lapis bata ringan).
   d. Cek pemasangan kolom praktis (10x10 cm atau 12x12 cm) dan balok lintel/ringbalk pada bukaan pintu/jendela serta setiap bidang dinding > 9 m².
   e. Berikan celah ekspansi (expansion joint) setebal 1.5 - 2 cm antara lapis bata teratas dengan balok struktur atas, lalu isi dengan sealant fleksibel atau polyurethane foam.

3. PEMERIKSAAN PLESTERAN & ACIAN:
   a. Sebelum diplester, pasang kawat ayam (wiremesh kassa) pada sambungan antara dinding bata ringan dengan kolom/balok beton untuk mencegah retak rambut.
   b. Buat kepalaan plesteran (guide lines) vertikal setiap jarak 1.5 m menggunakan waterpass dan unting-unting.
   c. Aplikasi plesteran secara merata tebal 8-10 mm dan biarkan mengering/curing minimal 3-5 hari sebelum aplikasi acian.
   d. Lakukan uji ketegakan dan kerataan permukaan dinding menggunakan mistar jidar aluminium panjang 2 meter (toleransi celah < 2 mm).`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      specType: 'Pekerjaan Saluran Drainase U-Ditch & Tutup (Cover)',
      category: 'Pekerjaan Saluran & Sanitasi',
      standardReference: 'SNI 03-6966-2003 / Spesifikasi Bina Marga Divisi 2',
      criticalPoints: '1. Kemiringan memanjang (slope gradien) saluran minimal 0.5% - 1%\n2. Ketepatan sambungan antar unit U-Ditch (joint interlocking)\n3. Penguncian sambungan dengan mortar semen waterproofing\n4. Pemadatan tanah timbunan samping (backfill) bertahap',
      acceptanceCriteria: 'Aliran air mengalir lancar gravitasi tanpa endapan/genangan (zero puddle). Elevasi bibir atas U-Ditch rata dengan elevasi jalan/trotoar rencana.',
      inspectionTools: 'Total Station / Waterpass Auto-Level, Rambu Ukur, Meteran Baja, Crane/Tackle Kapasitas Sesuai, Slump Cone (untuk mortar sambungan)',
      inspectionProcedure: `1. PEMERIKSAAN PRODUK PRECAST & PABRIKASI:
   a. Cek sertifikat mutu pabrikasi precast (kuat tekan beton U-Ditch min K-350 / f'c 30 MPa).
   b. Periksa fisik beton pracetak: tidak boleh ada retak struktural, gompal parah pada lidah-alur (interlocking male-female), atau tulangan mencuat keluar.
   c. Periksa dimensi penampang basah (lebar dalam, tinggi dalam, tebal dinding, tebal bibir) sesuai gambar rencana.

2. PEMERIKSAAN GALIAN & LANTAI KERJA (BEDDING):
   a. Periksa kedalaman dan profil kemiringan galian dengan waterpass autolevel untuk menjamin kemiringan hidrolis rencana.
   b. Pastikan telah dihamparkan pasir urug padat setebal 5 - 10 cm atau lean concrete (lantai kerja B-0) tebal 5 cm sebagai perletakan dasar unit U-Ditch yang stabil.

3. PEMERIKSAAN PENURUNAN & PENYAMBUNGAN UNIT:
   a. Awasi proses penurunan unit precast menggunakan mobile crane/tackle dengan web sling ganda untuk menjaga keselamatan dan keutuhan beton.
   b. Periksa kelurusan garis sumbu (alignment) memanjang dan elevasi bibir atas saluran.
   c. Lakukan penguncian dan penutupan celah sambungan antar unit menggunakan adukan spesi semen kedap air (grouting waterproofing) pada bagian dalam dan luar sambungan.

4. PEMASANGAN TUTUP (COVER) & TIMBUNAN KEMBALI:
   a. Pasang cover U-Ditch (tipe Heavy Duty untuk area lalu lintas kendaraan atau Light Duty untuk trotoar pedestrian).
   b. Lakukan penimbunan tanah kembali (backfilling) pada sisi kanan-kiri saluran lapis demi lapis (maksimal tebal per lapis 20 cm) dan dipadatkan dengan stamper kodok/tamping rammer tanpa membentur dinding saluran.`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  for (const spec of defaultSpecs) {
    await addTechnicalSpec(spec);
  }
};

// ==========================================
// Diskusi & Chat Proyek Real-Time
// ==========================================

export const getProjectMessages = (
  projectId: string, 
  callback: (messages: ProjectChatMessage[]) => void
) => {
  const path = `projects/${projectId}/messages`;
  const q = query(
    collection(db, 'projects', projectId, 'messages'), 
    orderBy('createdAt', 'asc')
  );

  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt
      } as ProjectChatMessage;
    });
    callback(messages);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, path);
  });
};

export const sendProjectMessage = async (
  projectId: string, 
  messageData: Omit<ProjectChatMessage, 'id' | 'createdAt'>
) => {
  const path = `projects/${projectId}/messages`;
  try {
    const cleaned = deepCleanUndefined({
      ...messageData,
      createdAt: Timestamp.now()
    });
    const docRef = await addDoc(collection(db, 'projects', projectId, 'messages'), cleaned);
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    throw error;
  }
};

export const deleteProjectMessage = async (projectId: string, messageId: string) => {
  const path = `projects/${projectId}/messages/${messageId}`;
  try {
    await deleteDoc(doc(db, 'projects', projectId, 'messages', messageId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    throw error;
  }
};

