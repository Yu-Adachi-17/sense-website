import { useTranslation } from 'react-i18next';
import defaultMeetingFormats from './MeetingFormatElements';

const useLocalizedMeetingFormats = () => {
  const { t } = useTranslation();

  // defaultMeetingFormats の各項目（title と template）をローカライズして返す
  const localizedMeetingFormats = defaultMeetingFormats.map((format) => ({
    ...format,
    title: t(format.title),
    template: t(format.template)
  }));

  return localizedMeetingFormats;
};

export default useLocalizedMeetingFormats;
