<template>
  <div v-if="client" class="client-detail-container space-y-12 p-8 max-w-7xl mx-auto">
    <!-- Header with Breadcrumbs Style -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div class="flex items-center gap-4">
        <Button @click="router.back()" variant="secondary" size="icon" class="h-12 w-12 rounded-2xl bg-white shadow-lg border border-slate-200 hover:bg-slate-50 transition-all active:scale-90">
             <ChevronLeft class="w-6 h-6 text-slate-600" />
        </Button>
        <div class="space-y-1">
          <div class="flex items-center gap-3 group">
              <template v-if="editingField === 'name'">
                <div class="flex gap-2">
                  <Input v-model="tempValue" class="h-10 text-xl font-black uppercase italic" @keyup.enter="triggerSave('name')" />
                  <Button size="icon" variant="ghost" @click="triggerSave('firstName')" class="h-10 w-10 text-emerald-500"><Check class="w-5 h-5" /></Button>
                  <Button size="icon" variant="ghost" @click="cancelEditing" class="h-10 w-10 text-rose-500"><X class="w-5 h-5" /></Button>
                </div>
              </template>
              <template v-else>
                <h1 class="text-3xl font-black tracking-tight text-slate-900 uppercase italic">{{ client.firstName }} <span class="text-indigo-600">{{ client.lastName }}</span></h1>
                <button v-if="authStore.isAdmin" @click="isEditing = true" class="opacity-0 group-hover:opacity-100 p-2 bg-slate-100 rounded-xl transition-all">
                  <Pencil class="w-4 h-4 text-slate-600" />
                </button>
              </template>
              <Badge :class="['text-[9px] font-black tracking-widest px-3 py-1 rounded-full border-2', getStatusInfo(client.status).class]">
                 {{ getStatusInfo(client.status).label }}
              </Badge>
          </div>
          <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] pl-0.5">Identifiant Client: {{ client._id.slice(-6).toUpperCase() }}</p>
        </div>
      </div>

      <div v-if="authStore.isAdmin" class="flex items-center gap-3">
        <Button @click="downloadPdf" variant="outline" class="h-12 px-6 rounded-2xl font-black uppercase text-[10px] tracking-widest border-slate-200 hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm">
           <Download class="w-4 h-4" /> PDF
        </Button>
        <Button v-if="!isComplete" @click="showFinishInfoDialog = true" class="h-12 px-6 rounded-2xl bg-amber-500 text-white hover:bg-amber-600 font-black uppercase text-[10px] tracking-widest shadow-xl shadow-amber-100 transition-all active:scale-95 gap-2">
          <AlertCircle class="w-4 h-4" />
          Finaliser le Dossier
        </Button>
        <Button variant="outline" @click="isEditing = true" class="h-12 px-6 rounded-2xl font-black uppercase text-[10px] tracking-widest border-slate-200 hover:bg-slate-50 transition-all">Modifier le Profil</Button>
        <Button variant="destructive" @click="deleteClient" class="h-12 px-6 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-rose-100 transition-all active:scale-95">Désactiver Compte</Button>
      </div>
    </div>

    <!-- Pending Changes Save Bar -->
    <div v-if="clientDirty" class="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-slate-900 text-white px-6 py-4 rounded-3xl shadow-2xl animate-in slide-in-from-bottom-4 duration-500">
      <div class="flex items-center gap-2">
        <div class="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse"></div>
        <span class="text-[10px] font-black uppercase tracking-widest">Modifications non enregistrées</span>
      </div>
      <div class="h-8 w-px bg-white/20"></div>
      <Button @click="cancelProfileChanges" variant="ghost" class="h-10 px-4 rounded-xl text-white/70 hover:text-white hover:bg-white/10 font-black uppercase text-[9px] tracking-widest transition-all">Annuler</Button>
      <Button @click="openProfilePasswordDialog" :disabled="saving" class="h-10 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase text-[9px] tracking-widest shadow-lg transition-all gap-2">
        <Check v-if="!saving" class="w-4 h-4" />
        <Loader2 v-else class="w-4 h-4 animate-spin" />
        Enregistrer
      </Button>
    </div>

    <!-- Main Dossier Card -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
      <!-- Left: Profile & Contact -->
      <div class="lg:col-span-4 space-y-6">
        <Card class="border border-slate-200/50 shadow-2xl shadow-slate-200/20 bg-white/70 backdrop-blur-3xl rounded-[2.5rem] overflow-hidden">
          <CardContent class="p-8 space-y-8">
            <div class="flex flex-col items-center text-center space-y-4">
               <div class="relative">
                 <Avatar class="w-28 h-28 border-4 border-white shadow-2xl">
                   <AvatarFallback class="bg-indigo-50 text-indigo-600 font-black text-2xl">
                     {{ getInitials(client.firstName, client.lastName) }}
                   </AvatarFallback>
                 </Avatar>
                 <div :class="['absolute bottom-1 right-1 w-7 h-7 rounded-full border-4 border-white shadow-lg', getStatusInfo(client.status).dot]"></div>
               </div>
               <div>
                  <span class="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">Contact Vérifié</span>
               </div>
            </div>

            <div class="space-y-6 pt-6 border-t border-slate-100">
                <div class="gap-4 grid grid-cols-1">
                  <div class="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 flex items-center gap-4 group">
                     <div class="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-indigo-600">
                        <Phone class="w-5 h-5" />
                     </div>
                     <div class="flex-1">
                        <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Téléphone</span>
                        <div v-if="editingField === 'phone'" class="flex items-center gap-2 mt-1">
                           <select v-model="tempPhoneCountryCode" class="h-8 w-20 rounded-xl border border-slate-200 px-1 text-[10px] font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white">
                             <option value="+216">+216</option>
                             <option value="+33">+33</option>
                             <option value="+39">+39</option>
                             <option value="+49">+49</option>
                             <option value="+34">+34</option>
                             <option value="+1">+1</option>
                             <option value="+44">+44</option>
                             <option value="+212">+212</option>
                             <option value="+213">+213</option>
                             <option value="+966">+966</option>
                             <option value="+971">+971</option>
                             <option value="+218">+218</option>
                           </select>
                           <Input v-model="tempValue" class="h-8 text-xs font-black tabular-nums flex-1" @keyup.enter="triggerSave('phone')" />
                           <button @click="triggerSave('phone')" class="text-emerald-500"><Check class="w-4 h-4" /></button>
                           <button @click="cancelEditing" class="text-rose-500"><X class="w-4 h-4" /></button>
                        </div>
                        <div v-else class="flex items-center justify-between">
                           <span class="font-black text-slate-900 tabular-nums"> {{ draftClient.phoneCountryCode || '+216' }} {{ draftClient.phone }}</span>
                           <button v-if="authStore.isAdmin" @click="startEditing('phone')" class="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-100 rounded transition-all">
                              <Pencil class="w-3.5 h-3.5 text-slate-400" />
                           </button>
                        </div>
                     </div>
                  </div>

                  <div class="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 flex items-center gap-4 group">
                     <div class="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-indigo-600">
                        <Mail class="w-5 h-5" />
                     </div>
                     <div class="flex-1 overflow-hidden">
                        <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Email de contact</span>
                        <div v-if="editingField === 'email'" class="flex items-center gap-2 mt-1">
                           <Input v-model="tempValue" class="h-8 text-xs font-black" @keyup.enter="triggerSave('email')" />
                           <button @click="triggerSave('email')" class="text-emerald-500"><Check class="w-4 h-4" /></button>
                           <button @click="cancelEditing" class="text-rose-500"><X class="w-4 h-4" /></button>
                        </div>
                        <div v-else class="flex items-center justify-between">
                           <span class="font-bold text-slate-600 truncate block text-xs lowercase italic">{{ draftClient.email || 'N/A' }}</span>
                           <button v-if="authStore.isAdmin" @click="startEditing('email')" class="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-100 rounded transition-all">
                              <Pencil class="w-3.5 h-3.5 text-slate-400" />
                           </button>
                        </div>
                     </div>
                  </div>

                  <div class="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 flex items-center gap-4 group">
                     <div class="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-indigo-600">
                        <MapPin class="w-5 h-5" />
                     </div>
                     <div class="flex-1">
                        <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Adresse Principale</span>
                        <div v-if="editingField === 'address'" class="flex items-center gap-2 mt-1">
                           <Input v-model="tempValue" class="h-8 text-xs font-black" @keyup.enter="triggerSave('address')" />
                           <button @click="triggerSave('address')" class="text-emerald-500"><Check class="w-4 h-4" /></button>
                           <button @click="cancelEditing" class="text-rose-500"><X class="w-4 h-4" /></button>
                        </div>
                        <div v-else class="flex items-center justify-between">
                           <span class="font-bold text-slate-600 text-xs leading-tight block">{{ draftClient.address || 'Non spécifiée' }}</span>
                           <button v-if="authStore.isAdmin" @click="startEditing('address')" class="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-100 rounded transition-all">
                              <Pencil class="w-3.5 h-3.5 text-slate-400" />
                           </button>
                        </div>
                     </div>
                  </div>
               </div>
            </div>

                <div class="flex justify-between items-center py-2 group">
                   <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <CreditCard class="w-3 h-3" /> {{ client.idCardType === 'passport' ? 'Numéro Passeport' : (client.idCardType === 'carte_sejour' ? 'Numéro Carte de Séjour' : 'Numéro CIN') }}
                   </span>
                   <div v-if="editingField === 'cin'" class="flex items-center gap-2">
                      <Input v-model="tempValue" class="h-8 w-32 text-xs font-black" @keyup.enter="triggerSave('cin')" />
                      <button @click="triggerSave('cin')" class="text-emerald-500"><Check class="w-4 h-4" /></button>
                      <button @click="cancelEditing" class="text-rose-500"><X class="w-4 h-4" /></button>
                   </div>
                   <div v-else class="flex items-center gap-2">
                      <span class="font-black text-slate-900 tabular-nums text-sm">{{ draftClient.cin }}</span>
                      <button v-if="authStore.isAdmin" @click="startEditing('cin')" class="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-100 rounded transition-all">
                        <Pencil class="w-3 h-3 text-slate-400" />
                      </button>
                   </div>
                </div>
                <div class="flex justify-between items-center py-2 group border-b border-slate-50/50">
                   <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Calendar class="w-3 h-3" /> {{ client.idCardType === 'passport' ? 'Date de délivrance Passeport' : (client.idCardType === 'carte_sejour' ? "Date d'émission Carte de Séjour" : "Date d'exportation CIN") }}
                   </span>
                   <div v-if="editingField === 'cinDate'" class="flex items-center gap-2">
                      <Input type="date" v-model="tempValue" class="h-8 text-xs font-black" @keyup.enter="triggerSave('cinDate')" />
                      <button @click="triggerSave('cinDate')" class="text-emerald-500"><Check class="w-4 h-4" /></button>
                      <button @click="cancelEditing" class="text-rose-500"><X class="w-4 h-4" /></button>
                   </div>
                   <div v-else class="flex items-center gap-2">
                      <span class="font-black text-slate-700 text-sm tabular-nums">{{ formatDate(draftClient.cinDate) || 'N/A' }}</span>
                      <button v-if="authStore.isAdmin" @click="startEditing('cinDate')" class="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-100 rounded transition-all">
                        <Pencil class="w-3 h-3 text-slate-400" />
                      </button>
                   </div>
                </div>
                <div class="flex justify-between items-center py-2 border-b border-slate-50 group">
                   <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <ShieldCheck class="w-3 h-3" /> Permis
                   </span>
                   <div v-if="editingField === 'drivingLicense'" class="flex items-center gap-2">
                      <Input v-model="tempValue" class="h-8 w-32 text-xs font-black" @keyup.enter="triggerSave('drivingLicense')" />
                      <button @click="triggerSave('drivingLicense')" class="text-emerald-500"><Check class="w-4 h-4" /></button>
                      <button @click="cancelEditing" class="text-rose-500"><X class="w-4 h-4" /></button>
                   </div>
                   <div v-else class="flex items-center gap-2">
                      <span class="font-black text-slate-900 tabular-nums text-sm uppercase">{{ draftClient.drivingLicense || 'N/A' }}</span>
                      <button v-if="authStore.isAdmin" @click="startEditing('drivingLicense')" class="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-100 rounded transition-all">
                         <Pencil class="w-3 h-3 text-slate-400" />
                      </button>
                   </div>
                </div>
                <div class="flex justify-between items-center py-2 group border-b border-slate-50/50">
                   <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <MapPin class="w-3 h-3" /> Lieu de Permis
                   </span>
                   <div v-if="editingField === 'lieuPermis'" class="flex items-center gap-2">
                      <Input v-model="tempValue" class="h-8 text-xs font-black" @keyup.enter="triggerSave('lieuPermis')" />
                      <button @click="triggerSave('lieuPermis')" class="text-emerald-500"><Check class="w-4 h-4" /></button>
                      <button @click="cancelEditing" class="text-rose-500"><X class="w-4 h-4" /></button>
                   </div>
                   <div v-else class="flex items-center gap-2">
                      <span class="font-black text-slate-700 text-sm">{{ draftClient.lieuPermis || 'N/A' }}</span>
                      <button v-if="authStore.isAdmin" @click="startEditing('lieuPermis')" class="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-100 rounded transition-all">
                         <Pencil class="w-3 h-3 text-slate-400" />
                      </button>
                   </div>
                </div>
                <div class="flex justify-between items-center py-2 group border-b border-slate-50/50">
                   <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Calendar class="w-3 h-3" /> Date d'exportation Permis
                   </span>
                   <div v-if="editingField === 'licenseDate'" class="flex items-center gap-2">
                      <Input type="date" v-model="tempValue" class="h-8 text-xs font-black" @keyup.enter="triggerSave('licenseDate')" />
                      <button @click="triggerSave('licenseDate')" class="text-emerald-500"><Check class="w-4 h-4" /></button>
                      <button @click="cancelEditing" class="text-rose-500"><X class="w-4 h-4" /></button>
                   </div>
                   <div v-else class="flex items-center gap-2">
                      <span class="font-black text-slate-700 text-sm tabular-nums">{{ formatDate(draftClient.licenseDate) || 'N/A' }}</span>
                      <button v-if="authStore.isAdmin" @click="startEditing('licenseDate')" class="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-100 rounded transition-all">
                        <Pencil class="w-3 h-3 text-slate-400" />
                      </button>
                   </div>
                </div>
                <div class="flex justify-between items-center py-2 group">
                   <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Calendar class="w-3 h-3" /> Naissance
                   </span>
                   <div v-if="editingField === 'birthday'" class="flex items-center gap-2">
                      <Input type="date" v-model="tempValue" class="h-8 text-xs font-black" @keyup.enter="triggerSave('birthday')" />
                      <button @click="triggerSave('birthday')" class="text-emerald-500"><Check class="w-4 h-4" /></button>
                      <button @click="cancelEditing" class="text-rose-500"><X class="w-4 h-4" /></button>
                   </div>
                   <div v-else class="flex items-center gap-2">
                      <span class="font-black text-slate-700 text-sm tabular-nums">{{ formatDate(draftClient.birthday) }}</span>
                      <button v-if="authStore.isAdmin" @click="startEditing('birthday')" class="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-100 rounded transition-all">
                         <Pencil class="w-3 h-3 text-slate-400" />
                      </button>
                   </div>
                </div>
                <div class="flex justify-between items-center py-2 group">
                   <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <MapPin class="w-3 h-3" /> Lieu de Naissance
                   </span>
                   <div v-if="editingField === 'lieuNaissance'" class="flex items-center gap-2">
                      <Input v-model="tempValue" class="h-8 text-xs font-black" @keyup.enter="triggerSave('lieuNaissance')" />
                      <button @click="triggerSave('lieuNaissance')" class="text-emerald-500"><Check class="w-4 h-4" /></button>
                      <button @click="cancelEditing" class="text-rose-500"><X class="w-4 h-4" /></button>
                   </div>
                   <div v-else class="flex items-center gap-2">
                      <span class="font-black text-slate-700 text-sm">{{ draftClient.lieuNaissance || 'N/A' }}</span>
                      <button v-if="authStore.isAdmin" @click="startEditing('lieuNaissance')" class="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-100 rounded transition-all">
                         <Pencil class="w-3 h-3 text-slate-400" />
                      </button>
                   </div>
                </div>
                <div class="flex justify-between items-center py-2 group">
                   <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Globe class="w-3 h-3" /> Nationalité
                   </span>
                   <div v-if="editingField === 'nationality'" class="flex items-center gap-2">
                      <Input v-model="tempValue" class="h-8 text-xs font-black" @keyup.enter="triggerSave('nationality')" />
                      <button @click="triggerSave('nationality')" class="text-emerald-500"><Check class="w-4 h-4" /></button>
                      <button @click="cancelEditing" class="text-rose-500"><X class="w-4 h-4" /></button>
                   </div>
                   <div v-else class="flex items-center gap-2">
                      <span class="font-black text-slate-700 text-sm">{{ draftClient.nationality || 'N/A' }}</span>
                      <button v-if="authStore.isAdmin" @click="startEditing('nationality')" class="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-100 rounded transition-all">
                         <Pencil class="w-3 h-3 text-slate-400" />
                      </button>
                   </div>
                </div>
                <div v-if="authStore.isAdmin && client.addedBy" class="flex justify-between items-center py-2 border-t border-slate-50 pt-4 mt-2">
                    <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                       <ShieldCheck class="w-3 h-3" /> Ajouté par
                    </span>
                    <Badge variant="secondary" class="font-black text-[10px] uppercase bg-slate-100 text-slate-600 border-none px-3">
                      {{ client.addedBy.firstName }} {{ client.addedBy.lastName }}
                    </Badge>
                 </div>
                 <div v-if="draftClient.description || editingField === 'description'" class="pt-6 border-t border-slate-100 space-y-3 group">
                     <div class="flex justify-between items-center">
                        <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Notes / Description</span>
                        <button v-if="authStore.isAdmin && editingField !== 'description'" @click="startEditing('description')" class="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-100 rounded transition-all">
                           <Pencil class="w-3 h-3 text-slate-400" />
                        </button>
                     </div>
                     <div v-if="editingField === 'description'" class="space-y-2">
                        <textarea v-model="tempValue" class="w-full h-32 rounded-xl border border-slate-200 p-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-slate-50/50 resize-none"></textarea>
                        <div class="flex justify-end gap-2">
                           <Button size="sm" variant="ghost" @click="cancelEditing" class="text-rose-500 font-black uppercase text-[8px] tracking-widest">Annuler</Button>
                           <Button size="sm" @click="triggerSave('description')" class="bg-indigo-600 text-white font-black uppercase text-[8px] tracking-widest px-4 rounded-lg">Enregistrer</Button>
                        </div>
                     </div>
                     <p v-else class="text-xs font-bold text-slate-500 leading-relaxed italic bg-slate-50/50 p-4 rounded-2xl border border-slate-100">{{ draftClient.description || 'Aucune note' }}</p>
                 </div>
          </CardContent>
        </Card>
      </div>

      <!-- Right: Documents & History -->
      <div class="lg:col-span-8 space-y-8 animate-in delay-200">
        <!-- Identity Dossier Gallery -->
        <Card class="border border-slate-200/50 shadow-2xl shadow-slate-200/20 bg-white/70 backdrop-blur-3xl rounded-[2.5rem] overflow-hidden">
          <CardHeader class="p-8 pb-0">
             <CardTitle class="text-xl font-black text-slate-900 uppercase tracking-tight">Galerie <span class="text-indigo-600 italic">des Pièces Justificatives</span></CardTitle>
          </CardHeader>
          <CardContent class="p-8">
            <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div v-for="doc in [
                { id: 'cinFront', label: client.idCardType === 'passport' ? 'Passeport' : (client.idCardType === 'carte_sejour' ? 'Carte de Séjour (Recto)' : 'CIN (Recto)') },
                ...(client.idCardType !== 'passport' ? [{ id: 'cinBack', label: client.idCardType === 'carte_sejour' ? 'Carte de Séjour (Verso)' : 'CIN (Verso)' }] : []),
                { id: 'licenseFront', label: 'Permis (Recto)' },
                { id: 'licenseBack', label: 'Permis (Verso)' }
              ]" :key="doc.id" class="space-y-3 group relative">
                <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center block">{{ doc.label }}</span>
                <div class="aspect-[3/2] rounded-3xl overflow-hidden border-2 border-slate-100 bg-slate-50 flex items-center justify-center relative shadow-sm hover:border-indigo-400 transition-all duration-500 cursor-zoom-in" @click="selectedImage = getImageUrl(draftClient[doc.id])">
                  <img v-if="draftClient[doc.id]" :src="getImageUrl(draftClient[doc.id])" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                  <div v-else class="flex flex-col items-center gap-2 text-slate-300">
                    <FileWarning class="w-6 h-6 stroke-1" />
                    <span class="text-[8px] font-black uppercase tracking-tighter">Manquant</span>
                  </div>
                  <div v-if="draftClient[doc.id]" class="absolute inset-0 bg-indigo-600/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </div>
                <!-- Action Buttons overlay -->
                <div v-if="authStore.isAdmin" class="absolute top-8 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all z-10">
                  <button 
                    @click.stop="triggerFileReplacement(doc.id)"
                    class="p-2 bg-white/90 shadow-lg rounded-xl hover:bg-white hover:scale-110"
                    title="Remplacer"
                  >
                    <Upload class="w-3.5 h-3.5 text-indigo-600" />
                  </button>
                  <button 
                    v-if="draftClient[doc.id]"
                    @click.stop="openCropper(doc.id)"
                    class="p-2 bg-white/90 shadow-lg rounded-xl hover:bg-white hover:scale-110"
                    title="Recadrer"
                  >
                    <Pencil class="w-3.5 h-3.5 text-indigo-600" />
                  </button>
                  <button 
                    v-if="draftClient[doc.id]"
                    @click.stop="triggerFileDeletion(doc.id)"
                    class="p-2 bg-white/90 shadow-lg rounded-xl hover:bg-white hover:scale-110 hover:text-rose-600"
                    title="Supprimer"
                  >
                    <Trash2 class="w-3.5 h-3.5 text-rose-500" />
                  </button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <!-- Rental Activity History -->
        <Card class="border border-slate-200/50 shadow-2xl shadow-slate-200/20 bg-white/70 backdrop-blur-3xl rounded-[2.5rem] overflow-hidden">
          <CardHeader class="p-8 pb-0 flex flex-row items-center justify-between">
            <CardTitle class="text-xl font-black text-slate-900 uppercase tracking-tight">Historique <span class="text-indigo-600 italic">Dossiers Client</span></CardTitle>
            <Badge variant="outline" class="font-black text-xs h-10 px-6 rounded-2xl bg-indigo-50/50 border-indigo-100 text-indigo-600">{{ unifiedHistory.length }} Activités</Badge>
          </CardHeader>
          <CardContent class="p-0">
             <div class="overflow-x-auto">
               <Table>
                 <TableHeader>
                   <TableRow class="bg-slate-50/50 border-b border-slate-100">
                     <TableHead class="pl-10 py-6 text-slate-400 font-black text-[9px] tracking-[0.3em] uppercase">TYPE</TableHead>
                     <TableHead class="py-6 text-slate-400 font-black text-[9px] tracking-[0.3em] uppercase">VÉHICULE</TableHead>
                     <TableHead class="text-slate-400 font-black text-[9px] tracking-[0.3em] uppercase text-center">PÉRIODE</TableHead>
                     <TableHead class="text-slate-400 font-black text-[9px] tracking-[0.3em] uppercase text-center">STATUT</TableHead>
                     <TableHead class="pr-10 text-right text-slate-400 font-black text-[9px] tracking-[0.3em] uppercase">GESTION</TableHead>
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                   <TableRow 
                     v-for="item in unifiedHistory" 
                     :key="item._id" 
                     class="group border-slate-100 transition-all duration-500 cursor-pointer hover:bg-slate-50/50 relative active:scale-[0.998]" 
                     @click="handleHistoryClick(item)"
                   >
                     <TableCell class="pl-10">
                        <Badge variant="outline" :class="['text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border', item.__type === 'contract' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-slate-50 text-slate-500 border-slate-100']">
                           {{ item.__type === 'contract' ? 'Contrat' : 'Réserv.' }}
                        </Badge>
                     </TableCell>
                     <TableCell class="py-7">
                        <div class="flex items-center gap-4">
                           <div class="w-11 h-11 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100 group-hover:bg-indigo-100 transition-all">
                              <CarIcon class="w-5 h-5" />
                           </div>
                           <div class="space-y-0.5">
                              <p class="font-black text-slate-900 group-hover:text-indigo-600 transition-colors tracking-tight text-base uppercase italic tabular-nums">{{ item.car?.brand }} {{ item.car?.model }}</p>
                              <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">{{ item.car?.matricule }}</p>
                           </div>
                        </div>
                     </TableCell>
                     <TableCell class="text-center">
                        <div class="flex flex-col items-center gap-1">
                           <span class="text-[11px] font-black text-slate-900 tabular-nums bg-white px-3 py-1 rounded-full border border-slate-100 shadow-sm">{{ formatDate(item.startDate) }}</span>
                           <span class="text-[9px] font-black text-slate-300 uppercase tracking-widest">au {{ formatDate(item.endDate) }}</span>
                        </div>
                     </TableCell>
                     <TableCell class="text-center">
                        <Badge :class="['text-[8px] font-black tracking-widest uppercase px-3 py-1 rounded-full border', getResStatusBadge(item.status).class]">
                           {{ getResStatusBadge(item.status).label }}
                        </Badge>
                     </TableCell>
                     <TableCell class="pr-10 text-right">
                          <div class="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0 duration-500">
                            <Button variant="secondary" size="icon" class="h-10 w-10 text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-xl shadow-sm">
                               <ExternalLink class="w-4 h-4 stroke-[2.5]" />
                            </Button>
                          </div>
                     </TableCell>
                   </TableRow>
                   <TableRow v-if="unifiedHistory.length === 0">
                     <TableCell colspan="5" class="h-60 text-center">
                       <div class="flex flex-col items-center gap-4 opacity-30">
                         <HistoryIcon class="w-16 h-16 stroke-[1]" />
                         <p class="font-black uppercase tracking-[0.3em] text-xs">Aucune activité enregistrée</p>
                       </div>
                     </TableCell>
                   </TableRow>
                 </TableBody>
               </Table>
             </div>
          </CardContent>
        </Card>
      </div>
    </div>

    <!-- Lightbox Modal Redux -->
    <Dialog :open="!!selectedImage" @update:open="selectedImage = null">
      <DialogContent class="max-w-6xl p-0 border-none bg-transparent shadow-none max-h-[95vh] overflow-hidden">
        <div class="relative w-full aspect-video flex items-center justify-center p-8">
          <button 
            @click="selectedImage = null" 
            class="absolute top-12 right-12 z-50 p-4 bg-white/20 hover:bg-white/40 text-white rounded-2xl backdrop-blur-3xl transition-all shadow-2xl border border-white/20 active:scale-90"
          >
            <X class="w-8 h-8" />
          </button>
          
          <img 
            :src="selectedImage || ''" 
            class="max-w-full max-h-full object-contain rounded-[3rem] shadow-[0_40px_100px_rgba(0,0,0,0.5)] p-0 animate-in zoom-in-95 duration-500" 
          />
        </div>
      </DialogContent>
    </Dialog>

    <!-- Finish Info Dialog -->
    <Dialog :open="showFinishInfoDialog" @update:open="showFinishInfoDialog = $event">
      <DialogContent class="!top-0 !translate-y-0 !left-0 !translate-x-0 w-full h-full max-w-full max-h-full bg-white border-0 rounded-none p-0 sm:!top-[5%] sm:!left-1/2 sm:!-translate-x-1/2 sm:max-w-xl sm:max-h-[90vh] sm:rounded-[2.5rem] sm:border-none overflow-y-auto">
        <div class="p-5 sm:p-10 space-y-6 sm:space-y-8 min-h-full sm:min-h-0">
          <div class="flex items-center gap-3 sm:gap-4 border-b border-slate-100 pb-4 sm:pb-6">
            <div class="p-2 sm:p-3 bg-amber-50 rounded-xl sm:rounded-2xl shrink-0">
              <AlertCircle class="w-5 h-5 sm:w-6 sm:h-6 text-amber-500" />
            </div>
            <div class="min-w-0">
              <DialogTitle class="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight truncate">Compléter le <span class="text-amber-500 italic">Dossier Client</span></DialogTitle>
              <p class="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1 truncate">Veuillez renseigner les informations manquantes</p>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div v-if="!client.cin" class="space-y-1.5 sm:space-y-2">
              <label class="text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                {{ client.idCardType === 'passport' ? 'Numéro Passeport' : (client.idCardType === 'carte_sejour' ? 'Numéro Carte de Séjour' : 'Numéro CIN') }}
              </label>
              <Input v-model="finishForm.cin" :placeholder="client.idCardType === 'passport' ? 'Ex: EP012345' : (client.idCardType === 'carte_sejour' ? 'Ex: 01234567' : 'Ex: 01234567')" class="h-10 sm:h-12 rounded-xl text-sm" />
            </div>
            <div v-if="!client.drivingLicense" class="space-y-1.5 sm:space-y-2">
              <label class="text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Permis de Conduire</label>
              <Input v-model="finishForm.drivingLicense" placeholder="Ex: 23/123456" class="h-10 sm:h-12 rounded-xl text-sm" />
            </div>
            <div v-if="!client.birthday" class="space-y-1.5 sm:space-y-2">
              <label class="text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Date de Naissance</label>
              <Input type="date" v-model="finishForm.birthday" class="h-10 sm:h-12 rounded-xl text-sm" />
            </div>
            <div v-if="!client.address" class="space-y-1.5 sm:space-y-2 col-span-full">
              <label class="text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Adresse Domicile</label>
              <Input v-model="finishForm.address" placeholder="Ex: 12 Rue des Oliviers, Tunis" class="h-10 sm:h-12 rounded-xl text-sm" />
            </div>
            <div v-if="!client.cinDate" class="space-y-1.5 sm:space-y-2">
              <label class="text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                {{ client.idCardType === 'passport' ? 'Date de délivrance Passeport' : (client.idCardType === 'carte_sejour' ? "Date d'émission Carte de Séjour" : "Date d'exportation CIN") }}
              </label>
              <Input type="date" v-model="finishForm.cinDate" class="h-10 sm:h-12 rounded-xl text-sm" />
            </div>
            <div v-if="!client.licenseDate" class="space-y-1.5 sm:space-y-2">
              <label class="text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Date d'exportation Permis</label>
              <Input type="date" v-model="finishForm.licenseDate" class="h-10 sm:h-12 rounded-xl text-sm" />
            </div>
            <div v-if="!client.lieuNaissance" class="space-y-1.5 sm:space-y-2">
              <label class="text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Lieu de Naissance</label>
              <Input v-model="finishForm.lieuNaissance" placeholder="Ex: Djerba" class="h-10 sm:h-12 rounded-xl text-sm" />
            </div>
            <div v-if="!client.lieuPermis" class="space-y-1.5 sm:space-y-2">
              <label class="text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Lieu de Permis</label>
              <Input v-model="finishForm.lieuPermis" placeholder="Ex: Djerba" class="h-10 sm:h-12 rounded-xl text-sm" />
            </div>
            <div v-if="!client.nationality" class="space-y-1.5 sm:space-y-2">
              <label class="text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nationalité</label>
              <Input v-model="finishForm.nationality" placeholder="Ex: Tunisienne" class="h-10 sm:h-12 rounded-xl text-sm" />
            </div>

            <!-- Identity Documents Upload (CIN) -->
            <div v-if="!client.cinFront" class="space-y-2 sm:space-y-3 pt-3 sm:pt-4 border-t border-slate-50 col-span-full sm:col-span-1">
              <label class="text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                {{ client.idCardType === 'passport' ? 'Passeport (Photo)' : (client.idCardType === 'carte_sejour' ? 'Carte de Séjour Recto (Photo)' : 'CIN Recto (Photo)') }}
              </label>
              <div @click="cinFrontInput?.click()" class="h-20 sm:h-24 rounded-xl sm:rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-1 sm:gap-2 cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 transition-all overflow-hidden relative">
                <img v-if="finishForm.cinFront" :src="getImageUrl(finishForm.cinFront)" class="absolute inset-0 w-full h-full object-cover opacity-50" />
                <div class="relative z-10 flex flex-col items-center gap-1">
                  <FileWarning v-if="!finishForm.cinFront" class="w-4 h-4 sm:w-5 sm:h-5 text-slate-300" />
                  <Check v-else class="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" />
                  <span class="text-[7px] sm:text-[8px] font-black uppercase tracking-widest text-slate-400">
                    {{ finishForm.cinFront ? 'Cliquer pour changer' : (client.idCardType === 'passport' ? 'Sélectionner Passeport' : (client.idCardType === 'carte_sejour' ? 'Sélectionner Carte de Séjour Recto' : 'Sélectionner CIN Recto')) }}
                  </span>
                </div>
                <input type="file" ref="cinFrontInput" class="hidden" accept="image/*" @change="e => handleFileSelection(e, 'cinFront')" />
              </div>
            </div>

            <div v-if="client.idCardType !== 'passport' && !client.cinBack" class="space-y-2 sm:space-y-3 pt-3 sm:pt-4 border-t border-slate-50 col-span-full sm:col-span-1">
              <label class="text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                {{ client.idCardType === 'carte_sejour' ? 'Carte de Séjour Verso (Photo)' : 'CIN Verso (Photo)' }}
              </label>
              <div @click="cinBackInput?.click()" class="h-20 sm:h-24 rounded-xl sm:rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-1 sm:gap-2 cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 transition-all overflow-hidden relative">
                <img v-if="finishForm.cinBack" :src="getImageUrl(finishForm.cinBack)" class="absolute inset-0 w-full h-full object-cover opacity-50" />
                <div class="relative z-10 flex flex-col items-center gap-1">
                  <FileWarning v-if="!finishForm.cinBack" class="w-4 h-4 sm:w-5 sm:h-5 text-slate-300" />
                  <Check v-else class="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" />
                  <span class="text-[7px] sm:text-[8px] font-black uppercase tracking-widest text-slate-400">
                    {{ finishForm.cinBack ? 'Cliquer pour changer' : (client.idCardType === 'carte_sejour' ? 'Sélectionner Carte de Séjour Verso' : 'Sélectionner CIN Verso') }}
                  </span>
                </div>
                <input type="file" ref="cinBackInput" class="hidden" accept="image/*" @change="e => handleFileSelection(e, 'cinBack')" />
              </div>
            </div>

            <!-- Driving License Upload -->
            <div v-if="!client.licenseFront" class="space-y-2 sm:space-y-3 pt-3 sm:pt-4 border-t border-slate-50 col-span-full sm:col-span-1">
              <label class="text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Permis Recto (Photo)</label>
              <div @click="licenseFrontInput?.click()" class="h-20 sm:h-24 rounded-xl sm:rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-1 sm:gap-2 cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 transition-all overflow-hidden relative">
                <img v-if="finishForm.licenseFront" :src="getImageUrl(finishForm.licenseFront)" class="absolute inset-0 w-full h-full object-cover opacity-50" />
                <div class="relative z-10 flex flex-col items-center gap-1">
                  <FileWarning v-if="!finishForm.licenseFront" class="w-4 h-4 sm:w-5 sm:h-5 text-slate-300" />
                  <Check v-else class="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" />
                  <span class="text-[7px] sm:text-[8px] font-black uppercase tracking-widest text-slate-400">{{ finishForm.licenseFront ? 'Cliquer pour changer' : 'Sélectionner Permis Recto' }}</span>
                </div>
                <input type="file" ref="licenseFrontInput" class="hidden" accept="image/*" @change="e => handleFileSelection(e, 'licenseFront')" />
              </div>
            </div>

            <div v-if="!client.licenseBack" class="space-y-2 sm:space-y-3 pt-3 sm:pt-4 border-t border-slate-50 col-span-full sm:col-span-1">
              <label class="text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Permis Verso (Photo)</label>
              <div @click="licenseBackInput?.click()" class="h-20 sm:h-24 rounded-xl sm:rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-1 sm:gap-2 cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 transition-all overflow-hidden relative">
                <img v-if="finishForm.licenseBack" :src="getImageUrl(finishForm.licenseBack)" class="absolute inset-0 w-full h-full object-cover opacity-50" />
                <div class="relative z-10 flex flex-col items-center gap-1">
                  <FileWarning v-if="!finishForm.licenseBack" class="w-4 h-4 sm:w-5 sm:h-5 text-slate-300" />
                  <Check v-else class="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" />
                  <span class="text-[7px] sm:text-[8px] font-black uppercase tracking-widest text-slate-400">{{ finishForm.licenseBack ? 'Cliquer pour changer' : 'Sélectionner Permis Verso' }}</span>
                </div>
                <input type="file" ref="licenseBackInput" class="hidden" accept="image/*" @change="e => handleFileSelection(e, 'licenseBack')" />
              </div>
            </div>
          </div>

          <div class="flex flex-col gap-2 sm:gap-3 pt-3 sm:pt-4">
             <Button @click="saveIncompleteInfo" :disabled="saving" class="h-11 sm:h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-[9px] sm:text-[10px] rounded-xl sm:rounded-2xl shadow-xl shadow-indigo-100 transition-all gap-2">
                <Check v-if="!saving" class="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <Loader2 v-else class="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
                Enregistrer les Informations
             </Button>
             <Button variant="ghost" @click="showFinishInfoDialog = false" class="text-slate-400 font-black uppercase text-[8px] sm:text-[9px] tracking-widest">Peut-être plus tard</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    <!-- Edit Profile Dialog -->
    <Dialog :open="isEditing" @update:open="isEditing = $event">
      <DialogContent class="!top-0 !translate-y-0 !left-0 !translate-x-0 w-full h-full max-w-full max-h-full bg-white border-0 rounded-none p-0 sm:!top-[5%] sm:!left-1/2 sm:!-translate-x-1/2 sm:max-w-xl sm:max-h-[90vh] sm:rounded-[2.5rem] sm:border-none overflow-y-auto">
        <div class="p-5 sm:p-10 space-y-6 sm:space-y-8 min-h-full sm:min-h-0">
          <div class="flex items-center gap-3 sm:gap-4 border-b border-slate-100 pb-4 sm:pb-6">
            <div class="p-2 sm:p-3 bg-indigo-50 rounded-xl sm:rounded-2xl shrink-0">
              <ShieldCheck class="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600" />
            </div>
            <div class="min-w-0">
              <DialogTitle class="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight truncate">Modifier le <span class="text-indigo-600 italic">Profil Client</span></DialogTitle>
              <p class="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1 truncate">Mise à jour des informations de base</p>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div class="space-y-1.5 sm:space-y-2">
              <label class="text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Prénom</label>
              <Input v-model="editForm.firstName" class="h-10 sm:h-12 rounded-xl text-sm" />
            </div>
            <div class="space-y-1.5 sm:space-y-2">
              <label class="text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nom</label>
              <Input v-model="editForm.lastName" class="h-10 sm:h-12 rounded-xl text-sm" />
            </div>
            <div class="space-y-1.5 sm:space-y-2">
              <label class="text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Téléphone</label>
              <div class="flex gap-2">
                <select v-model="editForm.phoneCountryCode" class="h-10 sm:h-12 w-24 shrink-0 rounded-xl border border-slate-200 px-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-slate-50/50">
                  <option value="+216">🇹🇳 +216</option>
                  <option value="+33">🇫🇷 +33</option>
                  <option value="+39">🇮🇹 +39</option>
                  <option value="+49">🇩🇪 +49</option>
                  <option value="+34">🇪🇸 +34</option>
                  <option value="+1">🇺🇸 +1</option>
                  <option value="+44">🇬🇧 +44</option>
                  <option value="+212">🇲🇦 +212</option>
                  <option value="+213">🇩🇿 +213</option>
                  <option value="+966">🇸🇦 +966</option>
                  <option value="+971">🇦🇪 +971</option>
                  <option value="+218">🇱🇾 +218</option>
                </select>
                <Input v-model="editForm.phone" class="h-10 sm:h-12 rounded-xl text-sm flex-1" />
              </div>
            </div>
            <div class="space-y-1.5 sm:space-y-2">
              <label class="text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Email</label>
              <Input v-model="editForm.email" class="h-10 sm:h-12 rounded-xl text-sm" />
            </div>
            <div class="space-y-1.5 sm:space-y-2 col-span-full">
              <label class="text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Adresse Domicile</label>
              <Input v-model="editForm.address" placeholder="Ex: 12 Rue des Oliviers, Tunis" class="h-10 sm:h-12 rounded-xl text-sm" />
            </div>
            <div class="space-y-1.5 sm:space-y-2">
              <label class="text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Lieu de Naissance</label>
              <Input v-model="editForm.lieuNaissance" placeholder="Ex: Djerba" class="h-10 sm:h-12 rounded-xl text-sm" />
            </div>
            <div class="space-y-1.5 sm:space-y-2">
              <label class="text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nationalité</label>
              <Input v-model="editForm.nationality" placeholder="Ex: Tunisienne" class="h-10 sm:h-12 rounded-xl text-sm" />
            </div>
            <div class="space-y-1.5 sm:space-y-2 col-span-full">
               <label class="text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Type de Pièce d'Identité</label>
               <select v-model="editForm.idCardType" class="w-full h-10 sm:h-12 rounded-xl border border-slate-200 px-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 appearance-none bg-slate-50/50">
                  <option value="cin">Carte d'Identité Nationale (CIN)</option>
                  <option value="passport">Passeport</option>
                  <option value="carte_sejour">Carte de Séjour</option>
               </select>
            </div>
            <div class="space-y-1.5 sm:space-y-2">
              <label class="text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                {{ editForm.idCardType === 'passport' ? 'Date de délivrance Passeport' : (editForm.idCardType === 'carte_sejour' ? "Date d'émission Carte de Séjour" : "Date d'exportation CIN") }}
              </label>
              <Input type="date" v-model="editForm.cinDate" class="h-10 sm:h-12 rounded-xl text-sm" />
            </div>
            <div class="space-y-1.5 sm:space-y-2">
              <label class="text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Date d'exportation Permis</label>
              <Input type="date" v-model="editForm.licenseDate" class="h-10 sm:h-12 rounded-xl text-sm" />
            </div>
            <div class="space-y-1.5 sm:space-y-2">
              <label class="text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Lieu de Permis</label>
              <Input v-model="editForm.lieuPermis" placeholder="Ex: Djerba" class="h-10 sm:h-12 rounded-xl text-sm" />
            </div>
            <div class="space-y-1.5 sm:space-y-2 col-span-full">
               <label class="text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Statut Client</label>
               <select v-model="editForm.status" class="w-full h-10 sm:h-12 rounded-xl border border-slate-200 px-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 appearance-none bg-slate-50/50">
                  <option value="WHITE_LIST">Dossier Conforme (White List)</option>
                  <option value="BLACK_LIST">Surveillance Active (Black List)</option>
                  <option value="BLOCK_LIST">Compte Restreint (Block List)</option>
               </select>
            </div>
            <div class="space-y-1.5 sm:space-y-2 col-span-full">
              <label class="text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Notes Internes / Description</label>
              <textarea v-model="editForm.description" class="w-full h-24 sm:h-32 rounded-xl border border-slate-200 p-3 sm:p-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-slate-50/50 resize-none"></textarea>
            </div>
          </div>

          <div class="flex flex-col gap-2 sm:gap-3 pt-3 sm:pt-4">
             <Button @click="requestFormSave" :disabled="saving" class="h-11 sm:h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-[9px] sm:text-[10px] rounded-xl sm:rounded-2xl shadow-xl shadow-indigo-100 transition-all gap-2">
                <Check v-if="!saving" class="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <Loader2 v-else class="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
                Sauvegarder les Modifications
             </Button>
             <Button variant="ghost" @click="isEditing = false" class="text-slate-400 font-black uppercase text-[8px] sm:text-[9px] tracking-widest">Annuler</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    <!-- Cropper Dialog -->
    <Dialog :open="showCropper" @update:open="showCropper = $event">
      <DialogContent class="max-w-[95vw] md:max-w-4xl h-[90vh] flex flex-col bg-white border-none shadow-2xl rounded-[2.5rem] p-6 md:p-10 overflow-hidden">
        <div class="space-y-6 flex flex-col h-full">
          <div class="flex items-center justify-between border-b border-slate-100 pb-4">
            <div class="flex items-center gap-4">
              <div class="p-3 bg-indigo-50 rounded-2xl">
                <ShieldCheck class="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <DialogTitle class="text-2xl font-black text-slate-900 uppercase tracking-tight">Ajuster la <span class="text-indigo-600 italic">Photo</span></DialogTitle>
                <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Recadrer ou pivoter l'image</p>
              </div>
            </div>
            <Button @click="rotate" variant="secondary" class="rounded-2xl h-12 w-12 p-0 hover:bg-indigo-100 transition-all active:rotate-90">
               <RotateCw class="w-5 h-5 text-indigo-600" />
            </Button>
          </div>

          <div class="flex-1 min-h-0 rounded-3xl overflow-hidden border-2 border-slate-100 bg-slate-50">
            <Cropper
              ref="cropperRef"
              :src="croppingImage"
              :stencil-props="{ aspectRatio: 3/2 }"
              class="h-full w-full"
            />
          </div>

          <div class="flex flex-col gap-3 pt-4">
             <Button @click="saveCroppedImage" :disabled="saving" class="h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl shadow-xl shadow-indigo-100 transition-all gap-2">
                <Check v-if="!saving" class="w-4 h-4" />
                <Loader2 v-else class="w-4 h-4 animate-spin" />
                Appliquer les Modifications
             </Button>
             <Button variant="ghost" @click="showCropper = false" class="text-slate-400 font-black uppercase text-[9px] tracking-widest">Annuler</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    <!-- Password Confirmation Dialog -->
    <PasswordConfirmDialog
      :open="showPasswordDialog"
      @update:open="(open: boolean) => { showPasswordDialog = open; if (!open) pendingFormSave = false }"
      v-model:password="adminPassword"
      title="Confirmation"
      subtitle="Admin"
      description="Mot de passe requis pour modifier les données"
      placeholder="••••••••"
      :confirm-label="pendingFormSave ? 'Confirmer la Modification' : 'Confirmer'"
      loading-label="Enregistrement..."
      :loading="saving"
      @confirm="confirmSave"
    />
    <input type="file" ref="replacementFileInput" class="hidden" accept="image/*" @change="handleReplacementFile" />
  </div>

  <div v-else class="flex flex-col items-center justify-center p-20 space-y-6">
    <div class="relative flex items-center justify-center">
       <div class="w-16 h-16 border-[6px] border-indigo-100 rounded-full"></div>
       <div class="w-16 h-16 border-[6px] border-indigo-600 border-t-transparent rounded-full animate-spin absolute inset-0"></div>
    </div>
    <div class="text-center space-y-1">
       <p class="text-indigo-600 font-black uppercase tracking-[0.4em] text-xs animate-pulse">Chargement Dossier</p>
       <p class="text-slate-300 font-bold italic text-[10px] uppercase tracking-widest">Veuillez patienter...</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { clientApi, reservationApi, contratApi, uploadApi, getImageUrl } from '@/api'
import { useAuthStore } from '@/stores/auth'
import { usePasswordGuard, handlePasswordError } from '@/composables/usePasswordGuard'
import { formatDate } from '@/lib/utils'
import { useToast } from 'primevue/usetoast'
import { 
ChevronLeft, Phone, Mail, MapPin, Globe,
CreditCard, ShieldCheck, Calendar, 
FileWarning, ExternalLink, Download, Pencil, RotateCw, Upload, Trash2,
Car as CarIcon, History as HistoryIcon, X, AlertCircle, Check, Loader2, Eye, EyeOff, Lock
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell 
} from '@/components/ui/table'
import { 
  Avatar, AvatarFallback 
} from '@/components/ui/avatar'
import {
  Dialog, DialogContent, DialogTitle
} from '@/components/ui/dialog'
import { PasswordConfirmDialog } from '@/components/ui/password-dialog'
import { Cropper } from 'vue-advanced-cropper'
import 'vue-advanced-cropper/dist/style.css'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const guard = usePasswordGuard()
const authStore = useAuthStore()
const client = ref<any>(null)
const reservations = ref<any[]>([])
const contracts = ref<any[]>([])
const loading = ref(true)
const saving = ref(false)
const selectedImage = ref<string | null>(null)
const showFinishInfoDialog = ref(false)
const isEditing = ref(false)

const finishForm = reactive({
  cin: '',
  drivingLicense: '',
  birthday: '',
  address: '',
  cinDate: '',
  licenseDate: '',
  cinFront: '',
  cinBack: '',
  licenseFront: '',
  licenseBack: '',
  lieuNaissance: '',
  lieuPermis: '',
  nationality: ''
})

const editForm = reactive({
  firstName: '',
  lastName: '',
  cin: '',
  drivingLicense: '',
  email: '',
  phone: '',
  phoneCountryCode: '+216',
  address: '',
  description: '',
  birthday: '',
  cinDate: '',
  licenseDate: '',
  status: '',
  idCardType: '',
  lieuNaissance: '',
  lieuPermis: '',
  nationality: ''
})

// Inline Editing State
const editingField = ref<string | null>(null)
const tempValue = ref<any>(null)
const tempPhoneCountryCode = ref('+216')
const showPasswordDialog = ref(false)
const adminPassword = ref('')
const showPassword = ref(false)
const draftClient = reactive<any>({})
const clientDirty = ref(false)
const pendingFormSave = ref(false)

const pendingDelete = ref(false)
const showCropper = ref(false)
const croppingImage = ref<string | null>(null)
const croppingField = ref<string | null>(null)
const cropperRef = ref<any>(null)
const rotation = ref(0)

// Template Refs for File Inputs
const cinFrontInput = ref<HTMLInputElement | null>(null)
const cinBackInput = ref<HTMLInputElement | null>(null)
const licenseFrontInput = ref<HTMLInputElement | null>(null)
const licenseBackInput = ref<HTMLInputElement | null>(null)
const replacementFileInput = ref<HTMLInputElement | null>(null)
const targetReplacementField = ref<string | null>(null)

const fetchClientData = async () => {
  loading.value = true
  try {
    const clientId = route.params.id as string
    const [clientData, resData, contData] = await Promise.all([
      clientApi.getOne(clientId),
      reservationApi.getAll({ clientId: clientId }),
      contratApi.getAll({ clientId: clientId })
    ])
    client.value = clientData
    initDraft()
    reservations.value = resData
    contracts.value = contData

    // Initialize finish form
    finishForm.cin = clientData.cin || ''
    finishForm.drivingLicense = clientData.drivingLicense || ''
    finishForm.birthday = clientData.birthday ? new Date(clientData.birthday).toISOString().split('T')[0] : ''
    finishForm.address = clientData.address || ''
    finishForm.cinDate = clientData.cinDate ? new Date(clientData.cinDate).toISOString().split('T')[0] : ''
    finishForm.licenseDate = clientData.licenseDate ? new Date(clientData.licenseDate).toISOString().split('T')[0] : ''
    finishForm.cinFront = clientData.cinFront || ''
    finishForm.cinBack = clientData.cinBack || ''
    finishForm.licenseFront = clientData.licenseFront || ''
    finishForm.licenseBack = clientData.licenseBack || ''
    finishForm.lieuNaissance = clientData.lieuNaissance || ''
    finishForm.lieuPermis = clientData.lieuPermis || ''
    finishForm.nationality = clientData.nationality || ''

    // Initialize edit form
    editForm.firstName = clientData.firstName || ''
    editForm.lastName = clientData.lastName || ''
    editForm.cin = clientData.cin || ''
    editForm.drivingLicense = clientData.drivingLicense || ''
    editForm.email = clientData.email || ''
    editForm.phone = clientData.phone || ''
    editForm.phoneCountryCode = clientData.phoneCountryCode || '+216'
    editForm.address = clientData.address || ''
    editForm.description = clientData.description || ''
    editForm.birthday = clientData.birthday ? new Date(clientData.birthday).toISOString().split('T')[0] : ''
    editForm.cinDate = clientData.cinDate ? new Date(clientData.cinDate).toISOString().split('T')[0] : ''
    editForm.licenseDate = clientData.licenseDate ? new Date(clientData.licenseDate).toISOString().split('T')[0] : ''
    editForm.status = clientData.status || ''
    editForm.idCardType = clientData.idCardType || 'cin'
    editForm.lieuNaissance = clientData.lieuNaissance || ''
    editForm.lieuPermis = clientData.lieuPermis || ''
    editForm.nationality = clientData.nationality || ''

    if (route.query.finishInfo === 'true' && !isComplete.value) {
      showFinishInfoDialog.value = true
    }
  } catch (err) {
    console.error('Failed to fetch client details', err)
  } finally {
    loading.value = false
  }
}

const unifiedHistory = computed(() => {
  // Extract IDs of reservations that are already converted to contracts
  const linkedResIds = contracts.value
    .map(c => c.reservation?._id || c.reservation)
    .filter(Boolean);

  const filteredReservations = reservations.value.filter(r => !linkedResIds.includes(r._id));

  // Combine and sort
  const combined = [
    ...contracts.value.map(c => ({ ...c, __type: 'contract' })),
    ...filteredReservations.map(r => ({ ...r, __type: 'reservation' }))
  ];

  return combined.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
});

const deleteClient = () => {
  if (!client.value) return
  if (!confirm('Êtes-vous sûr de vouloir supprimer ce client ? Cette action est irréversible.')) return
  pendingDelete.value = true
  showPasswordDialog.value = true
  adminPassword.value = ''
}

const confirmDelete = async () => {
  if (!client.value) return
  saving.value = true
  try {
    await clientApi.delete(client.value._id, adminPassword.value)
    guard.reset()
    router.push('/clients')
    toast.add({ severity: 'success', summary: 'Supprimé', detail: 'Le client a été désactivé.', life: 3000 })
  } catch (err: any) {
    console.error('Failed to delete client', err)
    if (handlePasswordError(err, toast)) return
    const msg = err.response?.data?.message || 'Erreur lors de la suppression.'
    toast.add({ severity: 'error', summary: 'Erreur', detail: msg, life: 5000 })
  } finally {
    saving.value = false
    showPasswordDialog.value = false
    pendingDelete.value = false
  }
}

const handleHistoryClick = (item: any) => {
  if (item.__type === 'contract') {
    // Direct contract item
    router.push(`/contrats/${item._id}`)
  } else if (item.contrat) {
    // Reservation linked to a contract
    const contratId = item.contrat._id || item.contrat
    router.push(`/contrats/${contratId}`)
  } else {
    // Pure reservation
    router.push(`/reservations?id=${item._id}`)
  }
}

const isComplete = computed(() => {
  if (!client.value) return true
  const hasBasicInfo = !!(
    client.value.cin && 
    client.value.drivingLicense && 
    client.value.birthday && 
    client.value.address &&
    client.value.cinFront &&
    client.value.licenseFront &&
    client.value.licenseBack
  )
  if (client.value.idCardType === 'passport') {
    return hasBasicInfo
  }
  return hasBasicInfo && !!client.value.cinBack
})

const handleFileSelection = async (event: any, field: 'cinFront' | 'cinBack' | 'licenseFront' | 'licenseBack') => {
  const file = event.target.files?.[0]
  if (!file) return
  
  try {
    const res = await uploadApi.upload(file)
    finishForm[field] = res.url
    toast.add({ severity: 'info', summary: 'Photo Chargée', detail: 'La pièce jointe a été envoyée avec succès.', life: 2000 })
  } catch (err) {
    console.error('File upload failed', err)
    toast.add({ severity: 'error', summary: 'Erreur Upload', detail: 'Impossible de charger la photo.', life: 3000 })
  }
}

const saveIncompleteInfo = async () => {
  if (!client.value) return
  saving.value = true
  
  // Prepare payload: only send fields that are actually filled
  const payload: any = {}
  if (finishForm.cin) payload.cin = finishForm.cin
  if (finishForm.drivingLicense) payload.drivingLicense = finishForm.drivingLicense
  if (finishForm.birthday) payload.birthday = new Date(finishForm.birthday)
  if (finishForm.cinDate) payload.cinDate = new Date(finishForm.cinDate)
  if (finishForm.licenseDate) payload.licenseDate = new Date(finishForm.licenseDate)
  if (finishForm.address) payload.address = finishForm.address
  if (finishForm.lieuNaissance) payload.lieuNaissance = finishForm.lieuNaissance
  if (finishForm.lieuPermis) payload.lieuPermis = finishForm.lieuPermis
  if (finishForm.nationality) payload.nationality = finishForm.nationality
  if (finishForm.cinFront) payload.cinFront = finishForm.cinFront
  if (finishForm.cinBack && client.value.idCardType !== 'passport') payload.cinBack = finishForm.cinBack
  if (finishForm.licenseFront) payload.licenseFront = finishForm.licenseFront
  if (finishForm.licenseBack) payload.licenseBack = finishForm.licenseBack

  try {
    console.log('[Frontend] Sending update payload:', JSON.stringify(payload, null, 2));
    const updatedClient = await clientApi.update(client.value._id, payload)
    console.log('[Frontend] Received update response:', JSON.stringify(updatedClient, null, 2));
    
    // Update local state immediately
    client.value = updatedClient
    
    // Clear the query parameter
    if (route.query.finishInfo) {
      router.replace({ query: {} })
    }

    // Still refresh everything else (contracts, etc) just in case
    await fetchClientData()
    
    showFinishInfoDialog.value = false
    toast.add({ 
      severity: 'success', 
      summary: 'Dossier Mis à Jour', 
      detail: 'Les informations ont été enregistrées avec succès.', 
      life: 3000 
    })
  } catch (err: any) {
    console.error('Failed to update client info', err)
    const errorMsg = err.response?.data?.message || 'Impossible de mettre à jour le dossier.'
    toast.add({ 
      severity: 'error', 
      summary: 'Erreur de Mise à Jour', 
      detail: errorMsg, 
      life: 5000 
    })
  } finally {
    saving.value = false
  }
}

const requestFormSave = () => {
  pendingFormSave.value = true
  adminPassword.value = ''
  showPasswordDialog.value = true
}

const confirmFormSave = async () => {
  if (!client.value || !adminPassword.value) return
  saving.value = true

  try {
    const payload: any = { ...editForm }
    if (!payload.cinDate) delete payload.cinDate
    if (!payload.licenseDate) delete payload.licenseDate
    if (!payload.birthday) delete payload.birthday
    payload.password = adminPassword.value

    const updatedClient = await clientApi.update(client.value._id, payload)
    guard.reset()
    client.value = updatedClient
    await fetchClientData()
    isEditing.value = false
    pendingFormSave.value = false
    showPasswordDialog.value = false
    adminPassword.value = ''
    toast.add({ 
      severity: 'success', 
      summary: 'Profil Mis à Jour', 
      detail: 'Les modifications ont été enregistrées avec succès.', 
      life: 3000 
    })
  } catch (err: any) {
    console.error('Failed to update client profile', err)
    if (handlePasswordError(err, toast)) return
    toast.add({ 
      severity: 'error', 
      summary: 'Erreur', 
      detail: 'Impossible de mettre à jour le profil.', 
      life: 5000 
    })
  } finally {
    saving.value = false
  }
}

const startEditing = (field: string) => {
  editingField.value = field
  tempValue.value = draftClient[field]
  if (field === 'phone') {
    tempPhoneCountryCode.value = draftClient.phoneCountryCode || '+216'
  }
  if ((field === 'birthday' || field === 'cinDate' || field === 'licenseDate') && tempValue.value) {
    tempValue.value = new Date(tempValue.value).toISOString().split('T')[0]
  }
}

const cancelEditing = () => {
  editingField.value = null
  tempValue.value = null
}

const triggerSave = (field: string) => {
  draftClient[field] = tempValue.value
  if (field === 'phone') {
    draftClient.phoneCountryCode = tempPhoneCountryCode.value
  }
  editingField.value = null
  tempValue.value = null
  clientDirty.value = true
}

const initDraft = () => {
  if (!client.value) return
  Object.keys(draftClient).forEach((k) => delete draftClient[k])
  Object.assign(draftClient, JSON.parse(JSON.stringify(client.value)))
  clientDirty.value = false
}

const buildProfilePayload = () => {
  const editable = [
    'firstName', 'lastName', 'cin', 'drivingLicense', 'email', 'phone', 'phoneCountryCode',
    'address', 'description', 'birthday', 'cinDate', 'licenseDate',
    'lieuNaissance', 'lieuPermis', 'nationality',
    'cinFront', 'cinBack', 'licenseFront', 'licenseBack'
  ]
  const payload: any = {}
  for (const f of editable) {
    if (draftClient[f] !== undefined && draftClient[f] !== null) payload[f] = draftClient[f]
  }
  ;['birthday', 'cinDate', 'licenseDate'].forEach((f) => {
    if (payload[f]) payload[f] = new Date(payload[f])
  })
  return payload
}

const openProfilePasswordDialog = () => {
  adminPassword.value = ''
  showPasswordDialog.value = true
}

const cancelProfileChanges = () => {
  editingField.value = null
  tempValue.value = null
  initDraft()
}

const confirmDraftSave = async () => {
  if (!client.value || !adminPassword.value) return
  saving.value = true
  try {
    const payload = buildProfilePayload()
    payload.password = adminPassword.value

    const updatedClient = await clientApi.update(client.value._id, payload)
    guard.reset()
    client.value = updatedClient
    await fetchClientData()
    showPasswordDialog.value = false
    adminPassword.value = ''
    toast.add({ severity: 'success', summary: 'Profil Mis à Jour', detail: 'Les modifications ont été enregistrées.', life: 3000 })
  } catch (err: any) {
    console.error('Failed to save profile', err)
    if (handlePasswordError(err, toast)) return
    const msg = err.response?.data?.message || 'Erreur lors de la mise à jour.'
    toast.add({ severity: 'error', summary: 'Erreur', detail: msg, life: 5000 })
  } finally {
    saving.value = false
  }
}

const confirmSave = async () => {
  if (pendingDelete.value) {
    await confirmDelete()
    return
  }
  if (pendingFormSave.value) {
    await confirmFormSave()
    return
  }
  await confirmDraftSave()
}

const openCropper = (field: string) => {
  croppingField.value = field
  croppingImage.value = getImageUrl(draftClient[field])
  showCropper.value = true
  rotation.value = 0
}

const rotate = () => {
  if (cropperRef.value) {
    cropperRef.value.rotate(90);
  }
}

const saveCroppedImage = async () => {
  if (!cropperRef.value || !croppingField.value || !client.value) return
  
  const { canvas } = cropperRef.value.getResult()
  if (!canvas) return
  
  saving.value = true
  try {
    const blob = await new Promise<Blob>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9))
    const file = new File([blob], `${croppingField.value}.jpg`, { type: 'image/jpeg' })
    
    const uploadRes = await uploadApi.upload(file)
    
    // Stage the cropped image into the draft — apply via Enregistrer + password
    draftClient[croppingField.value] = uploadRes.url
    clientDirty.value = true
    croppingField.value = null
    showCropper.value = false
    toast.add({ severity: 'success', summary: 'Aperçu Mis à Jour', detail: 'Cliquez sur « Enregistrer » pour appliquer.', life: 3000 })
  } catch (err) {
    console.error('Failed to crop/upload image', err)
    toast.add({ severity: 'error', summary: 'Erreur', detail: 'Échec de l\'upload de l\'image.', life: 5000 })
  } finally {
    saving.value = false
  }
}

const triggerFileReplacement = (field: string) => {
  targetReplacementField.value = field
  replacementFileInput.value?.click()
}

const handleReplacementFile = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file || !targetReplacementField.value) return
  
  saving.value = true
  try {
    const uploadRes = await uploadApi.upload(file)
    draftClient[targetReplacementField.value] = uploadRes.url
    clientDirty.value = true
    toast.add({ severity: 'success', summary: 'Aperçu Mis à Jour', detail: 'Cliquez sur « Enregistrer » pour appliquer.', life: 3000 })
  } catch (err) {
    console.error('Failed to upload replacement file', err)
    toast.add({ severity: 'error', summary: 'Erreur', detail: 'Échec de l\'upload de l\'image.', life: 5000 })
  } finally {
    saving.value = false
    target.value = '' // Clear input
  }
}

const triggerFileDeletion = (field: string) => {
  if (!confirm('Êtes-vous sûr de vouloir supprimer cette image ?')) return
  draftClient[field] = ''
  clientDirty.value = true
}

const downloadPdf = async () => {
  if (!client.value) return;
  try {
    const blob = await clientApi.getPdf(client.value._id);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `client-${client.value.lastName}-${client.value.firstName}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  } catch (err) {
    console.error('Failed to download PDF', err);
    toast.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de générer le PDF.', life: 3000 });
  }
};

onMounted(fetchClientData)

const getStatusInfo = (status: string) => {
  switch (status) {
    case 'WHITE_LIST':
      return { label: 'Dossier Conforme', class: 'bg-emerald-50 text-emerald-600 border-emerald-100/50', dot: 'bg-emerald-500' }
    case 'BLACK_LIST':
      return { label: 'Surveillance Active', class: 'bg-amber-50 text-amber-600 border-amber-100/50', dot: 'bg-amber-500' }
    case 'BLOCK_LIST':
      return { label: 'Compte Restreint', class: 'bg-rose-50 text-rose-600 border-rose-100/50', dot: 'bg-rose-500' }
    default:
      return { label: 'Statut Inconnu', class: 'bg-slate-50 text-slate-400 border-slate-100', dot: 'bg-slate-300' }
  }
}

const getResStatusBadge = (status: string) => {
  const s = status.toLowerCase();
  switch (s) {
    case 'confirmed':
    case 'executed':
      return { label: 'Exécuté', class: 'bg-emerald-50 text-emerald-600 border-emerald-100' }
    case 'active':
      return { label: 'Actif', class: 'bg-indigo-50 text-indigo-600 border-indigo-100' }
    case 'closed':
      return { label: 'Terminé', class: 'bg-slate-100 text-slate-600 border-slate-200' }
    case 'pending':
      return { label: 'Planifié', class: 'bg-amber-50 text-amber-600 border-amber-100' }
    case 'cancelled':
      return { label: 'Annulé', class: 'bg-rose-50 text-rose-400 border-rose-100' }
    default:
      return { label: status, class: 'bg-slate-50 text-slate-400' }
  }
}

const getInitials = (firstName: string, lastName: string) => {
  return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase()
}
</script>

<style scoped>
.client-detail-container {
  font-family: 'Inter', sans-serif;
}

.delay-200 {
  animation-delay: 0.2s;
}

:deep(.dialog-blur) {
  backdrop-filter: blur(20px);
}
</style>
