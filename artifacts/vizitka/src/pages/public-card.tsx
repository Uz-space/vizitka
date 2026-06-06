import { Link } from "wouter";
import { FaInstagram, FaTelegram, FaPhone } from "react-icons/fa";
import { useGetProfile } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export default function PublicCard() {
  const { data: profile, isLoading } = useGetProfile();

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center p-4 sm:p-8 bg-background">
        <Card className="w-full max-w-md mx-auto shadow-xl border-0 overflow-hidden rounded-[2rem] bg-card">
          <CardContent className="p-8 sm:p-12 flex flex-col items-center text-center">
            <Skeleton className="w-32 h-32 rounded-full mb-8" />
            <Skeleton className="h-10 w-3/4 mb-3" />
            <Skeleton className="h-5 w-1/2 mb-8" />
            <Skeleton className="h-24 w-full mb-10" />
            <div className="flex gap-4 w-full justify-center">
              <Skeleton className="w-14 h-14 rounded-full" />
              <Skeleton className="w-14 h-14 rounded-full" />
              <Skeleton className="w-14 h-14 rounded-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-background text-center p-4">
        <h1 className="font-serif text-2xl text-muted-foreground mb-4">Profile not found.</h1>
        <Link href="/admin">
          <Button variant="outline" className="rounded-full px-8 font-medium">Set up profile</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center p-4 sm:p-8 bg-background relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-3xl pointer-events-none" />

      <Card className="w-full max-w-md mx-auto shadow-2xl border border-white/50 overflow-hidden rounded-[2rem] bg-card/80 backdrop-blur-xl z-10">
        <CardContent className="p-8 sm:p-12 flex flex-col items-center text-center">
          
          <div className="relative mb-8 group">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl scale-110 group-hover:scale-125 transition-transform duration-500" />
            {profile.photoUrl ? (
              <img 
                src={profile.photoUrl} 
                alt={profile.fullName} 
                className="w-32 h-32 rounded-full object-cover relative z-10 border-4 border-background shadow-md"
              />
            ) : (
              <div className="w-32 h-32 rounded-full bg-secondary flex items-center justify-center relative z-10 border-4 border-background shadow-md">
                <span className="font-serif text-4xl text-primary">
                  {profile.fullName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>

          <h1 className="font-serif text-3xl sm:text-4xl font-semibold tracking-tight text-foreground mb-2">
            {profile.fullName}
          </h1>
          
          {profile.title && (
            <p className="text-primary font-medium tracking-wide uppercase text-xs sm:text-sm mb-8">
              {profile.title}
            </p>
          )}

          <div className="w-12 h-[1px] bg-border mb-8" />

          {profile.bio && (
            <p className="text-muted-foreground text-base leading-relaxed mb-10 text-balance max-w-sm">
              {profile.bio}
            </p>
          )}

          <div className="flex flex-wrap gap-4 w-full justify-center">
            {profile.instagram && (
              <a 
                href={`https://instagram.com/${profile.instagram.replace('@', '')}`}
                target="_blank"
                rel="norenoopener noreferrer"
                className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#fd5949] to-[#d6249f] text-white flex items-center justify-center shadow-lg hover:scale-110 hover:-translate-y-1 transition-all duration-300"
                aria-label="Instagram"
              >
                <FaInstagram size={24} />
              </a>
            )}
            
            {profile.telegram && (
              <a 
                href={`https://t.me/${profile.telegram.replace('@', '')}`}
                target="_blank"
                rel="norenoopener noreferrer"
                className="w-14 h-14 rounded-full bg-[#0088cc] text-white flex items-center justify-center shadow-lg hover:scale-110 hover:-translate-y-1 transition-all duration-300"
                aria-label="Telegram"
              >
                <FaTelegram size={24} className="-ml-1" />
              </a>
            )}

            {profile.phone && (
              <a 
                href={`tel:${profile.phone}`}
                className="w-14 h-14 rounded-full bg-[#25D366] text-white flex items-center justify-center shadow-lg hover:scale-110 hover:-translate-y-1 transition-all duration-300"
                aria-label="Phone"
              >
                <FaPhone size={22} />
              </a>
            )}
          </div>

        </CardContent>
      </Card>
      
      <div className="mt-8 z-10 opacity-60 hover:opacity-100 transition-opacity">
        <Link href="/admin">
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-widest cursor-pointer pb-1 border-b border-transparent hover:border-muted-foreground transition-all">
            Admin Login
          </span>
        </Link>
      </div>
    </div>
  );
}
