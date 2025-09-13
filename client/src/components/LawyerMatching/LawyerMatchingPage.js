import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Alert,
  Snackbar,
  Pagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Card,
  CardContent,
  CircularProgress
} from '@mui/material';
import {
  Sort as SortIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';
import { useTranslation } from '../../hooks/useTranslation';
import LawyerSearchForm from './LawyerSearchForm';
import LawyerProfile from './LawyerProfile';
import ConsultationBooking from './ConsultationBooking';
import axios from 'axios';

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Best Match' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'price_low', label: 'Price: Low to High' },
  { value: 'price_high', label: 'Price: High to Low' },
  { value: 'experience', label: 'Most Experienced' },
  { value: 'availability', label: 'Soonest Available' }
];

const LawyerMatchingPage = () => {
  const { t } = useTranslation();
  const [lawyers, setLawyers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchFilters, setSearchFilters] = useState({});
  const [sortBy, setSortBy] = useState('relevance');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedLawyer, setSelectedLawyer] = useState(null);
  const [showBooking, setShowBooking] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    // Load initial lawyers or perform search if filters exist
    if (Object.keys(searchFilters).length > 0) {
      handleSearch(searchFilters);
    }
  }, [sortBy, currentPage]);

  const handleSearch = async (filters) => {
    setLoading(true);
    setError(null);
    setSearchFilters(filters);
    setCurrentPage(1);

    try {
      const response = await axios.post('/api/lawyers/search', {
        ...filters,
        sortBy,
        page: currentPage,
        limit: 10
      });

      setLawyers(response.data.lawyers);
      setTotalPages(response.data.totalPages);
    } catch (error) {
      console.error('Failed to search lawyers:', error);
      setError(error.response?.data?.message || t('lawyer_matching.search_error'));
    } finally {
      setLoading(false);
    }
  };

  const handleSortChange = (newSortBy) => {
    setSortBy(newSortBy);
    if (Object.keys(searchFilters).length > 0) {
      handleSearch(searchFilters);
    }
  };

  const handlePageChange = (event, page) => {
    setCurrentPage(page);
  };

  const handleContactLawyer = async (lawyer) => {
    try {
      // In real app, this would open a contact form or messaging interface
      setSuccess(t('lawyer_matching.contact_initiated', { name: lawyer.profile.name }));
    } catch (error) {
      console.error('Failed to contact lawyer:', error);
      setError(t('lawyer_matching.contact_error'));
    }
  };

  const handleBookConsultation = (lawyer) => {
    setSelectedLawyer(lawyer);
    setShowBooking(true);
  };

  const handleBookingComplete = async (bookingData) => {
    setBookingLoading(true);
    
    try {
      const response = await axios.post('/api/consultations/book', {
        lawyerId: selectedLawyer.id,
        ...bookingData
      });

      setSuccess(t('lawyer_matching.booking_success'));
      setShowBooking(false);
      setSelectedLawyer(null);
      
      // Optionally redirect to consultation details or dashboard
    } catch (error) {
      console.error('Failed to book consultation:', error);
      setError(error.response?.data?.message || t('lawyer_matching.booking_error'));
    } finally {
      setBookingLoading(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          {t('lawyer_matching.page_title')}
        </Typography>
        <Typography variant="h6" color="text.secondary">
          {t('lawyer_matching.page_subtitle')}
        </Typography>
      </Box>

      {/* Search Form */}
      <LawyerSearchForm
        onSearch={handleSearch}
        loading={loading}
        initialFilters={searchFilters}
      />

      {/* Results Section */}
      {lawyers.length > 0 && (
        <Box sx={{ mt: 4 }}>
          {/* Results Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h5">
              {t('lawyer_matching.search_results')} ({lawyers.length})
            </Typography>
            
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>{t('lawyer_matching.sort_by')}</InputLabel>
              <Select
                value={sortBy}
                onChange={(e) => handleSortChange(e.target.value)}
                label={t('lawyer_matching.sort_by')}
                startAdornment={<SortIcon sx={{ mr: 1 }} />}
              >
                {SORT_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {t(`lawyer_matching.sort_options.${option.value}`) || option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {/* Loading State */}
          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          )}

          {/* Lawyer Results */}
          {!loading && (
            <Box>
              {lawyers.map((lawyer) => (
                <LawyerProfile
                  key={lawyer.id}
                  lawyer={lawyer}
                  onContact={handleContactLawyer}
                  onBookConsultation={handleBookConsultation}
                  compact={true}
                />
              ))}

              {/* Pagination */}
              {totalPages > 1 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                  <Pagination
                    count={totalPages}
                    page={currentPage}
                    onChange={handlePageChange}
                    color="primary"
                    size="large"
                  />
                </Box>
              )}
            </Box>
          )}
        </Box>
      )}

      {/* No Results */}
      {!loading && lawyers.length === 0 && Object.keys(searchFilters).length > 0 && (
        <Card sx={{ mt: 4 }}>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <FilterIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              {t('lawyer_matching.no_results')}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {t('lawyer_matching.no_results_suggestion')}
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* Initial State */}
      {!loading && lawyers.length === 0 && Object.keys(searchFilters).length === 0 && (
        <Card sx={{ mt: 4 }}>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <Typography variant="h5" gutterBottom>
              {t('lawyer_matching.get_started')}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {t('lawyer_matching.get_started_description')}
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* Consultation Booking Dialog */}
      {selectedLawyer && (
        <ConsultationBooking
          open={showBooking}
          onClose={() => {
            setShowBooking(false);
            setSelectedLawyer(null);
          }}
          lawyer={selectedLawyer}
          onBookingComplete={handleBookingComplete}
          loading={bookingLoading}
        />
      )}

      {/* Snackbar for notifications */}
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError(null)}
      >
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!success}
        autoHideDuration={4000}
        onClose={() => setSuccess(null)}
      >
        <Alert severity="success" onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default LawyerMatchingPage;