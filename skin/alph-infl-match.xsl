<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
    <xsl:import href="beta-uni-util.xsl"/>
    <xsl:import href="uni2ascii.xsl"/>
    <xsl:import href="normalize-greek.xsl"/>
    
    <xsl:template name="check_infl_sets">
        <xsl:param name="selected_endings"/>
        <xsl:param name="current_data"/>
        <xsl:param name="match_pofs"/>
        <xsl:param name="normalize_greek"/>
        <xsl:param name="match_form"/>
        <xsl:param name="infl_constraint"/>
        <xsl:variable name="matches">
            <xsl:for-each select="$selected_endings//div[@class='alph-infl-set' and 
                (../div[contains(@class,'alph-dict')]//span[(contains(@class,'alph-pofs')) and (@context = $match_pofs)])
                or
                (span[(contains(@class,'alph-pofs') and @context = $match_pofs)])
                ]
                ">
                <xsl:variable name="match_text">
                    <xsl:choose>
                        <xsl:when test="$match_form != ''"> 
                            <!-- match the originally selected form 
                                 it must be the form from context of the word, which 
                                 is the user's selected form, as the context on
                                 the inflection set is the stem+suffix which may not
                                 be exactly the same (See Bug 152)-->
                            <xsl:value-of select="$match_form"/>                
                        </xsl:when>
                        <!-- empty suffixes are matched with _ -->
                        <xsl:when test="span[contains(@class,'alph-term')]/span[contains(@class,'alph-suff') and not(text())]">_</xsl:when>
                        <xsl:otherwise><!-- match the ending -->
                            <xsl:value-of select="span[contains(@class,'alph-term')]/span[contains(@class,'alph-suff')]"/>                  
                        </xsl:otherwise>
                    </xsl:choose>
                </xsl:variable>
                <xsl:variable name="normalized_match_text">
                    <xsl:choose>
                        <xsl:when test="$normalize_greek and not($match_text = '_')">
                            <xsl:call-template name="normalize-greek">
                                <xsl:with-param name="input" select="$match_text"/>
                                <xsl:with-param name="strip">/\^_</xsl:with-param>
                            </xsl:call-template>                              
                        </xsl:when>
                        <xsl:otherwise>
                            <xsl:value-of select="$match_text"/>
                        </xsl:otherwise>
                    </xsl:choose>
                </xsl:variable>
                <xsl:variable name="possible">
                    <xsl:for-each select="div[@class='alph-infl']">
                        <xsl:variable name="fail_infl_constraint">
                            <xsl:call-template name="check_infl_constraint">
                                <xsl:with-param name="infl" select="."/>
                                <xsl:with-param name="constraint_data" 
                                    select="$infl_constraint"/>
                            </xsl:call-template>
                        </xsl:variable>
                        <xsl:if test="not($fail_infl_constraint = '1')">
                        <xsl:call-template name="find_infl_match">
                            <xsl:with-param name="current_data" select="$current_data"/>
                            <xsl:with-param name="filtered_data" select="(.)"/>
                            <xsl:with-param name="match_pofs" select="$match_pofs"/>
                        </xsl:call-template>
                        </xsl:if>
                    </xsl:for-each>
                </xsl:variable>
                <xsl:if test="$possible &gt; 0">,<xsl:value-of select="$normalized_match_text"/>,</xsl:if>
            </xsl:for-each>    
        </xsl:variable>
        <xsl:value-of select="$matches"/>
    </xsl:template>
    
    <xsl:template name="find_infl_match">
        <xsl:param name="current_data"/>
        <xsl:param name="filtered_data"/>
        <xsl:param name="match_pofs"/>
        <xsl:param name="att_pos" select="0"/>
        
        <xsl:variable name="num_atts" select="count($current_data/@*)"/>
        <xsl:choose>
            <!-- if we don't have any attributes to check on the current cell
                then just skip it
            -->            
            <xsl:when test="$num_atts = 0">0</xsl:when>
            <xsl:when test="$current_data/@case">
                <!-- handle attributes with case non-recursively because we need
                     to match case number and gender together
                     only require matches on attributes which are actually
                     in the inflection table 
                -->
                <xsl:variable name="match_case">
                    <xsl:if test="$current_data/@case">
                        <xsl:value-of select="
                            concat(
                            '|',
                            translate($current_data/@case,' ','|'),
                            '|')"/>
                    </xsl:if>
                </xsl:variable>
                <xsl:variable name="match_num">
                    <xsl:if test="$current_data/@num">
                        <xsl:value-of select="
                            concat(
                            '|',
                        translate($current_data/@num,' ','|'),
                        '|')"/>        
                    </xsl:if>
                </xsl:variable>
                <xsl:variable name="match_gend">
                    <xsl:if test="$current_data/@gend">
                        <xsl:value-of select="
                            concat(
                            '|',
                            translate($current_data/@gend,' ','|'),
                            '|')"/>
                            <!-- make sure that we match the 'common' gender for 
                                 endings which are either masculine or feminine
                            -->                            
                        <xsl:if test="contains($current_data/@gend, 'masculine') or
                            contains($current_data/@gend,'feminine')">|common|
                        </xsl:if>
                    </xsl:if>
                </xsl:variable>
                <xsl:variable name="match_decl">
                    <xsl:if test="$current_data/@decl">
                        <xsl:value-of select="
                            concat(
                            '|',
                            translate($current_data/@decl,' ','|'),
                            '|')"/>
                    </xsl:if>
                </xsl:variable>
                <xsl:choose>
                    <xsl:when test="not($current_data/@decl) or
                            ($filtered_data/../..//span[contains(@class,'alph-decl') 
                            and (contains($match_decl,
                                 concat('|',substring-before(@context,'_'),'|')) 
                                 or
                                 contains($match_decl,
                                 concat('|',@context,'|'))
                            )])">
                        <xsl:value-of select="count($filtered_data//span[contains(@class,'alph-case')
                            and ($match_case = '' or contains($match_case,concat('|',substring-before(@context,'-'),'|')))
                            and (@alph-pofs = $match_pofs)
                            and ($match_gend = '' or 
                                contains($match_gend,concat('|',@alph-gend,'|'))
                                or @alph-gend = 'all')
                            and ($match_num = '' or contains($match_num,concat('|',@alph-num,'|')))
                            ])"/>        
                    </xsl:when>
                    <xsl:otherwise>0</xsl:otherwise>
                </xsl:choose>
            </xsl:when> 
            <xsl:when test="$att_pos = $num_atts">
                <!-- if we have tested all the possible attributes return the match count-->
                <xsl:value-of select="count($filtered_data)"/>
            </xsl:when>          
            <xsl:when test="($att_pos &lt; $num_atts) and $filtered_data">
                <!-- only try match if current data element has the attribute -->
                <xsl:for-each select="$current_data/@*">
                    <xsl:if test="position() = $att_pos + 1">
                        <xsl:variable name="att_name" select="name()"/>                       
                        <!-- should we skip this attribute? -->
                        <xsl:variable name="skip_att">
                            <xsl:call-template name="check_att">
                                <xsl:with-param name="att_name" select="$att_name"/>
                                <xsl:with-param name="data" select="$current_data"/>
                            </xsl:call-template>
                        </xsl:variable>
                        <!-- translate spaces to pipes in the attribute value so that we can
                             isolate each value
                        -->
                        <xsl:variable name="att_value">
                            <xsl:value-of select=
                                "concat(
                                '|',
                                translate($current_data/@*[local-name(.)=$att_name],' ','|'),
                                '|')"/>
                        </xsl:variable>                        
                        <xsl:choose>
                            <xsl:when test="$skip_att = '1'">
                                <!-- just advance the counter for the ones we're skipping -->
                                <xsl:call-template name="find_infl_match">
                                    <xsl:with-param name="current_data" select="$current_data"/>
                                    <xsl:with-param name="filtered_data" 
                                        select="$filtered_data"/>
                                    <xsl:with-param name="att_pos" select="$att_pos+1"/>
                                </xsl:call-template>                                
                            </xsl:when>
                            <!-- stemtype is on the infl-set -->
                            <xsl:when test="$att_name = 'stemtype'">
                                <xsl:variable name="class_name">
                                    <xsl:value-of select="concat('alph-',$att_name)"/>
                                </xsl:variable>
                                <!-- test on stemtype assumes morpheus output only ever outputs
                                     a single stemtype for a given form, but that inflection data
                                     stemtype attribute may be multi-valued -->
                                <xsl:variable name="latest_data"
                                    select="$filtered_data[ancestor::div[@class='alph-infl-set']//span
                                        [contains(@class,$class_name) and 
                                            contains(concat('|',$att_value,'|'),concat('|',@context,'|'))
                                            
                                         ]]"/>
                                <xsl:call-template name="find_infl_match">
                                    <xsl:with-param name="current_data" select="$current_data"/>
                                    <xsl:with-param name="filtered_data" 
                                        select="$latest_data"/>
                                    <xsl:with-param name="att_pos" select="$att_pos+1"/>
                                </xsl:call-template>               
                            </xsl:when>
                            <xsl:otherwise>
                                <xsl:variable name="class_name">
                                    <xsl:value-of select="concat('alph-',$att_name)"/>
                                </xsl:variable>
                                <xsl:variable name="latest_data"
                                    select="$filtered_data[(
                                    (contains($att_value,concat('|',span[contains(@class,$class_name)]/text(),'|')))
                                    or
                                    (contains($att_value,concat('|',span[contains(@class,$class_name)]/@context,'|')))
                                    )]"/>
                                <xsl:call-template name="find_infl_match">
                                    <xsl:with-param name="current_data" select="$current_data"/>
                                    <xsl:with-param name="filtered_data" 
                                        select="$latest_data"/>
                                    <xsl:with-param name="att_pos" select="$att_pos+1"/>
                                </xsl:call-template>                                
                            </xsl:otherwise>
                        </xsl:choose>                                        
                    </xsl:if>
                </xsl:for-each>                
            </xsl:when>
            <xsl:otherwise>0</xsl:otherwise>
        </xsl:choose>
    </xsl:template>    
    
    <!-- templates which can be overridden for language and pofs to control matching
         behavior
    -->
    <!-- template to filter matching to specific attributes -->
    <xsl:template name="check_att">
        <xsl:param name="att_name"/>
        <xsl:param name="data"/>
    </xsl:template>
    
    <!-- template to filter matching to specific inflection sets -->
    <xsl:template name="check_infl_constraint">
        <xsl:param name="infl"/>
        <xsl:param name="constraint_data"/>
    </xsl:template>
</xsl:stylesheet>

