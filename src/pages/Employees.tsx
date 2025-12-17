import React, { useState, useRef } from 'react';
import { useAppStore, Employee, Signature } from '../App';
import { Plus, Search, User, MoreHorizontal, Pencil, Trash2, Eye, Upload, Image as ImageIcon } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Card, CardContent, CardHeader } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner@2.0.3';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { AspectRatio } from "../components/ui/aspect-ratio";

export const Employees: React.FC = () => {
  const { employees, addEmployee, updateEmployee, deleteEmployee, signatures, addSignature, deleteSignature } = useAppStore();
  const [search, setSearch] = useState('');
  
  // --- Employee State ---
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Employee>>({
    status: 'Active',
    role: 'Staff'
  });

  const [viewingEmployee, setViewingEmployee] = useState<Employee | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // --- Signature State ---
  const [isSigDialogOpen, setIsSigDialogOpen] = useState(false);
  const [sigFormData, setSigFormData] = useState<Partial<Signature>>({});
  const [sigDeleteId, setSigDeleteId] = useState<string | null>(null);
  const [isSigDeleteOpen, setIsSigDeleteOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Employee Logic ---
  const filteredEmployees = employees.filter(e => 
    e.name.toLowerCase().includes(search.toLowerCase()) || 
    e.eid.toLowerCase().includes(search.toLowerCase())
  );

  const resetForm = () => {
    setFormData({ status: 'Active', role: 'Staff' });
    setIsEditing(false);
    setCurrentId(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const handleEdit = (emp: Employee) => {
    setFormData(emp);
    setCurrentId(emp.id);
    setIsEditing(true);
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.eid || !formData.dob || !formData.status || !formData.role) {
      toast.error('Please fill in all mandatory fields');
      return;
    }

    if (isEditing && currentId) {
      updateEmployee(currentId, formData);
      toast.success('Employee updated successfully');
    } else {
      addEmployee(formData as Omit<Employee, 'id'>);
      toast.success('Employee added successfully');
    }
    setIsDialogOpen(false);
    resetForm();
  };

  const handleDeleteClick = (id: string) => {
    setDeleteId(id);
    setIsDeleteOpen(true);
  };

  const confirmDelete = () => {
    if (deleteId) {
      deleteEmployee(deleteId);
      toast.success('Employee deleted successfully');
      setIsDeleteOpen(false);
      setDeleteId(null);
    }
  };

  const handleView = (emp: Employee) => {
    setViewingEmployee(emp);
    setIsViewOpen(true);
  };

  // --- Signature Logic ---
  const handleOpenAddSig = () => {
    setSigFormData({});
    setIsSigDialogOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500000) { // 500KB limit
        toast.error("Image file too large. Please use an image under 500KB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setSigFormData(prev => ({ ...prev, imageUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSigSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sigFormData.name || !sigFormData.role || !sigFormData.imageUrl) {
      toast.error('Please fill in all fields and upload a signature image.');
      return;
    }
    addSignature(sigFormData as Omit<Signature, 'id'>);
    toast.success('Signature added successfully');
    setIsSigDialogOpen(false);
    setSigFormData({});
  };

  const handleSigDeleteClick = (id: string) => {
    setSigDeleteId(id);
    setIsSigDeleteOpen(true);
  };

  const confirmSigDelete = () => {
    if (sigDeleteId) {
      deleteSignature(sigDeleteId);
      toast.success('Signature deleted successfully');
      setIsSigDeleteOpen(false);
      setSigDeleteId(null);
    }
  };


  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Employee Management</h1>
      </div>

      <Tabs defaultValue="employees" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
          <TabsTrigger value="employees">Employees</TabsTrigger>
          <TabsTrigger value="signatures">Signatures</TabsTrigger>
        </TabsList>
        
        {/* Employees Tab */}
        <TabsContent value="employees" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button onClick={handleOpenAdd} className="w-full sm:w-auto bg-blue-900 hover:bg-blue-800">
              <Plus className="mr-2 h-4 w-4" /> Add Employee
            </Button>
          </div>

          <Card>
            <CardHeader>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  className="pl-9"
                  placeholder="Search by Name or ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>EID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Date of Birth</TableHead>
                    <TableHead>Joining Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center h-24 text-gray-500">
                        No employees found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredEmployees.map((emp) => (
                      <TableRow key={emp.id}>
                        <TableCell className="font-medium">{emp.eid}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-900">
                              <User size={14} />
                            </div>
                            {emp.name}
                          </div>
                        </TableCell>
                        <TableCell>{emp.role}</TableCell>
                        <TableCell>{new Date(emp.dob).toLocaleDateString()}</TableCell>
                        <TableCell>{emp.joiningDate ? new Date(emp.joiningDate).toLocaleDateString() : '-'}</TableCell>
                        <TableCell>
                          <Badge variant={emp.status === 'Active' ? 'default' : 'destructive'}>
                            {emp.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => handleView(emp)}>
                                <Eye className="mr-2 h-4 w-4" /> View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEdit(emp)}>
                                <Pencil className="mr-2 h-4 w-4" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleDeleteClick(emp.id)} className="text-red-600">
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Signatures Tab */}
        <TabsContent value="signatures" className="space-y-4 mt-4">
           <div className="flex justify-end">
            <Button onClick={handleOpenAddSig} className="w-full sm:w-auto bg-blue-900 hover:bg-blue-800">
              <Plus className="mr-2 h-4 w-4" /> Add Signature
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {signatures.map((sig) => (
              <Card key={sig.id}>
                <CardContent className="p-4 flex flex-col gap-4">
                  <div className="aspect-[3/1] bg-gray-50 border rounded-md overflow-hidden flex items-center justify-center relative">
                    {sig.imageUrl ? (
                      <img src={sig.imageUrl} alt={`${sig.name} signature`} className="w-full h-full object-contain" />
                    ) : (
                      <ImageIcon className="text-gray-300 h-10 w-10" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{sig.name}</h3>
                    <p className="text-sm text-gray-500">{sig.role}</p>
                  </div>
                  <div className="flex justify-end">
                    <Button variant="destructive" size="sm" onClick={() => handleSigDeleteClick(sig.id)}>
                      <Trash2 className="h-4 w-4 mr-2" /> Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {signatures.length === 0 && (
              <div className="col-span-full text-center py-10 text-gray-500 bg-white rounded-lg border border-dashed">
                <p>No signatures added yet.</p>
                <p className="text-sm mt-1">Add signatures to use them in timesheets.</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Employee Dialogs (Add/Edit, View, Delete) - Same as before */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Edit Employee' : 'Add New Employee'}</DialogTitle>
            <DialogDescription>
              {isEditing ? 'Update the employee details below.' : 'Fill in the details to add a new employee to the system.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name <span className="text-red-500">*</span></Label>
              <Input 
                id="name" 
                value={formData.name || ''} 
                onChange={e => setFormData({...formData, name: e.target.value})}
                placeholder="John Doe"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="eid">Employee ID (EID) <span className="text-red-500">*</span></Label>
              <Input 
                id="eid" 
                value={formData.eid || ''} 
                onChange={e => setFormData({...formData, eid: e.target.value})}
                placeholder="TCF001"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 flex flex-col">
                <Label htmlFor="dob">Date of Birth <span className="text-red-500">*</span></Label>
                <Input
                  id="dob"
                  type="date"
                  value={formData.dob || ''}
                  onChange={e => setFormData({...formData, dob: e.target.value})}
                  required
                  className="accent-blue-900 [&::-webkit-calendar-picker-indicator]:filter-[brightness(0)_saturate(100%)]"
                />
              </div>
              <div className="space-y-2 flex flex-col">
                <Label htmlFor="joiningDate">Joining Date</Label>
                <Input
                  id="joiningDate"
                  type="date"
                  value={formData.joiningDate || ''}
                  onChange={e => setFormData({...formData, joiningDate: e.target.value})}
                  className="accent-blue-900 [&::-webkit-calendar-picker-indicator]:filter-[brightness(0)_saturate(100%)]"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="gender">Gender <span className="text-red-500">*</span></Label>
              <Select 
                value={formData.gender} 
                onValueChange={(val: any) => setFormData({...formData, gender: val})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role <span className="text-red-500">*</span></Label>
              <Select 
                value={formData.role} 
                onValueChange={(val: any) => setFormData({...formData, role: val})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Staff">Staff</SelectItem>
                  <SelectItem value="Admin/HR">Admin/HR</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status <span className="text-red-500">*</span></Label>
              <Select 
                value={formData.status} 
                onValueChange={(val: any) => setFormData({...formData, status: val})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Resigned">Resigned</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="submit" className="bg-blue-900 hover:bg-blue-800">
                {isEditing ? 'Update Employee' : 'Save Employee'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Employee Details</DialogTitle>
            <DialogDescription>
              Information about {viewingEmployee?.name}
            </DialogDescription>
          </DialogHeader>
          {viewingEmployee && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Full Name</Label>
                  <div className="font-medium">{viewingEmployee.name}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Employee ID</Label>
                  <div className="font-medium">{viewingEmployee.eid}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Role</Label>
                  <div className="font-medium">{viewingEmployee.role}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Date of Birth</Label>
                  <div className="font-medium">{new Date(viewingEmployee.dob).toLocaleDateString()}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Gender</Label>
                  <div className="font-medium">{viewingEmployee.gender || 'Not Set'}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Joining Date</Label>
                  <div className="font-medium">
                    {viewingEmployee.joiningDate ? new Date(viewingEmployee.joiningDate).toLocaleDateString() : '-'}
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <div>
                    <Badge variant={viewingEmployee.status === 'Active' ? 'default' : 'destructive'}>
                      {viewingEmployee.status}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
             <Button variant="outline" onClick={() => setIsViewOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the employee.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Signature Dialogs */}
      <Dialog open={isSigDialogOpen} onOpenChange={setIsSigDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Signature</DialogTitle>
            <DialogDescription>
              Upload a signature image to use in timesheets.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSigSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sigName">Signatory Name <span className="text-red-500">*</span></Label>
              <Input 
                id="sigName" 
                value={sigFormData.name || ''} 
                onChange={e => setSigFormData({...sigFormData, name: e.target.value})}
                placeholder="e.g., John Manager"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sigRole">Role/Designation <span className="text-red-500">*</span></Label>
              <Input 
                id="sigRole" 
                value={sigFormData.role || ''} 
                onChange={e => setSigFormData({...sigFormData, role: e.target.value})}
                placeholder="e.g., HR Manager"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sigImage">Signature Image <span className="text-red-500">*</span></Label>
              <div className="flex flex-col gap-2">
                <Input 
                  id="sigImage" 
                  type="file" 
                  accept="image/*"
                  onChange={handleFileChange}
                  ref={fileInputRef}
                  required
                />
                <p className="text-xs text-gray-500">Max size: 500KB. Transparent PNG recommended.</p>
              </div>
              {sigFormData.imageUrl && (
                <div className="mt-2 border rounded p-2 bg-gray-50">
                  <p className="text-xs text-gray-500 mb-1">Preview:</p>
                  <div className="h-20 flex items-center justify-center">
                    <img src={sigFormData.imageUrl} alt="Preview" className="max-h-full object-contain" />
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="submit" className="bg-blue-900 hover:bg-blue-800">
                Save Signature
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isSigDeleteOpen} onOpenChange={setIsSigDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Signature?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSigDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
};
